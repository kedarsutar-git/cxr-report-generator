import time
import json
from pathlib import Path
from threading import Thread

import torch
from transformers import AutoTokenizer, TextIteratorStreamer

from .config import settings
from .model.architecture import CXRReportModel, CHEXPERT_LABELS
from .model.preprocess import load_xray
from .model.gradcam_utils import make_overlay
from .postprocess import split_report


class ReportService:
    def __init__(self):
        self.device = self._resolve_device()
        self.tokenizer = AutoTokenizer.from_pretrained(settings.lm_name)
        self.tokenizer.pad_token = self.tokenizer.eos_token

        self.model = CXRReportModel(lm_name=settings.lm_name)

        weights_file = Path(settings.weights_path)
        if weights_file.exists():
            state = torch.load(weights_file, map_location="cpu")
            sd = state["model"] if isinstance(state, dict) and "model" in state else state
            self.model.load_state_dict(sd, strict=False)
            self.version = state.get("version", "v1.0") if isinstance(state, dict) else "v1.0"
            print(f"[ReportService] Loaded weights from {weights_file}")
        else:
            self.version = "v1.0-untrained"
            print(f"[ReportService] WARNING: {weights_file} not found — running untrained.")

        self.model.to(self.device).eval()

    def _resolve_device(self):
        if settings.device != "auto":
            return torch.device(settings.device)
        return torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # ==================================================================
    # Standard (non-streaming) prediction WITH Grad-CAM heatmap
    # ==================================================================
    def predict(self, image_bytes: bytes):
        t0 = time.perf_counter()
        pixel_values = load_xray(image_bytes).to(self.device)

        # ---- 1. Text generation (no gradients needed) ----
        with torch.no_grad():
            text, probs = self.model.generate_report(
                pixel_values, self.tokenizer,
                max_new_tokens=settings.max_new_tokens,
                num_beams=settings.num_beams,
            )
        findings, impression = split_report(text)

        # ---- 2. Grad-CAM (needs gradients — separate pass) ----
        heatmap_data_url = None
        try:
            cam = self.model.compute_gradcam(pixel_values.clone())
            heatmap_data_url = make_overlay(image_bytes, cam)
        except Exception as e:
            print(f"[warn] gradcam failed: {type(e).__name__}: {e}")

        # ---- 3. Assemble response ----
        tags = sorted(
            [{"label": l, "probability": float(p)} for l, p in zip(CHEXPERT_LABELS, probs)],
            key=lambda x: -x["probability"],
        )[:5]

        return {
            "findings": findings,
            "impression": impression,
            "full_report": text,
            "findings_tags": tags,
            "latency_ms": round((time.perf_counter() - t0) * 1000, 1),
            "model_version": self.version,
            "heatmap": heatmap_data_url,
        }

    # ==================================================================
    # Streaming (SSE) prediction — yields tokens as they generate
    # ==================================================================
    def predict_stream(self, image_bytes: bytes):
        """
        Server-Sent Events generator.
        Yields:
            data: {"token": "..."}                         for each token
            data: {"done": true, "findings": ..., ...}     at the end
        """
        self.model.eval()
        pixel_values = load_xray(image_bytes).to(self.device)

        # ---- Build the same visual prefix + prompt used by generate_report ----
        vis, bos, pooled = self.model._visual_prefix(pixel_values)

        prompt_ids = self.tokenizer(
            "Findings:", return_tensors="pt", add_special_tokens=False
        ).input_ids.to(self.device)
        prompt_embeds = self.model.llm.get_input_embeddings()(prompt_ids)

        inputs_embeds = torch.cat([vis, bos, prompt_embeds], dim=1)

        # ---- Streamer (skip prompt + special tokens for clean output) ----
        streamer = TextIteratorStreamer(
            self.tokenizer,
            skip_prompt=True,
            skip_special_tokens=True,
        )

        gen_kwargs = dict(
            inputs_embeds=inputs_embeds,
            max_new_tokens=settings.max_new_tokens,
            do_sample=True,
            temperature=0.75,
            top_p=0.92,
            top_k=50,
            repetition_penalty=1.15,
            no_repeat_ngram_size=3,
            eos_token_id=self.tokenizer.eos_token_id,
            pad_token_id=self.tokenizer.pad_token_id,
            streamer=streamer,
        )

        # ---- Run generation in a background thread (so we can yield tokens) ----
        thread = Thread(target=self.model.llm.generate, kwargs=gen_kwargs)
        thread.start()

        # ---- Yield each token as an SSE event ----
        full_text = ""
        for token in streamer:
            if not token:
                continue
            full_text += token
            yield f"data: {json.dumps({'token': token})}\n\n"

        thread.join()

        # ---- Compute CheXpert classification scores from pooled features ----
        with torch.no_grad():
            probs = torch.sigmoid(pooled)[0].cpu().numpy()

        tags = sorted(
            [{"label": l, "probability": float(p)} for l, p in zip(CHEXPERT_LABELS, probs)],
            key=lambda x: -x["probability"],
        )[:5]

        # ---- Split findings + impression ----
        text_with_prefix = "Findings: " + full_text.strip()
        findings, impression = split_report(text_with_prefix)

        # ---- Grad-CAM (needs gradients — separate pass) ----
        heatmap_data_url = None
        try:
            cam = self.model.compute_gradcam(pixel_values.clone())
            heatmap_data_url = make_overlay(image_bytes, cam)
        except Exception as e:
            print(f"[warn] gradcam failed (stream): {type(e).__name__}: {e}")

        # ---- Final SSE event with full metadata ----
        final_payload = {
            "done": True,
            "findings": findings,
            "impression": impression,
            "tags": tags,
            "full": text_with_prefix,
            "heatmap": heatmap_data_url,
        }
        yield f"data: {json.dumps(final_payload)}\n\n"


service: ReportService | None = None


def get_service() -> ReportService:
    global service
    if service is None:
        service = ReportService()
    return service