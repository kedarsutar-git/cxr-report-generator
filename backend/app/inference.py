import time
from pathlib import Path
import torch
from transformers import GPT2Tokenizer

from .config import settings
from .model.architecture import CXRReportModel, CHEXPERT_LABELS
from .model.preprocess import load_xray
from .postprocess import split_report


class ReportService:
    def __init__(self):
        self.device = self._resolve_device()
        self.tokenizer = GPT2Tokenizer.from_pretrained(settings.lm_name)
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

    @torch.no_grad()
    def predict(self, image_bytes: bytes):
        t0 = time.perf_counter()
        pixel_values = load_xray(image_bytes).to(self.device)

        text, probs = self.model.generate_report(
            pixel_values, self.tokenizer,
            max_new_tokens=settings.max_new_tokens,
            num_beams=settings.num_beams,
        )
        findings, impression = split_report(text)

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
        }


service: ReportService | None = None

def get_service() -> ReportService:
    global service
    if service is None:
        service = ReportService()
    return service