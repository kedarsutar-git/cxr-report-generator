import torch
import torch.nn as nn
import torchvision.models as tvm
from transformers import AutoModelForCausalLM as GPT2LMHeadModel

CHEXPERT_LABELS = [
    "Atelectasis", "Cardiomegaly", "Effusion", "Infiltration", "Mass",
    "Nodule", "Pneumonia", "Pneumothorax", "Consolidation", "Edema",
    "Emphysema", "Fibrosis", "Pleural_Thickening", "Hernia",
]


class VisualEncoder(nn.Module):
    def __init__(self, embed_dim: int = 768, pretrained: bool = True):
        super().__init__()
        weights = tvm.DenseNet121_Weights.IMAGENET1K_V1 if pretrained else None
        densenet = tvm.densenet121(weights=weights)

        self.features = densenet.features
        self.proj = nn.Conv2d(1024, embed_dim, kernel_size=1)
        self.norm = nn.LayerNorm(embed_dim)

        self.pos = nn.Parameter(torch.zeros(1, 49, embed_dim))
        nn.init.trunc_normal_(self.pos, std=0.02)

        self.embed_dim = embed_dim

    def forward(self, pixel_values: torch.Tensor) -> torch.Tensor:
        f = self.features(pixel_values)
        f = self.proj(f)
        f = f.flatten(2).transpose(1, 2)
        f = f + self.pos
        return self.norm(f)


class CXRReportModel(nn.Module):
    def __init__(
        self,
        lm_name: str = "microsoft/biogpt",
        embed_dim: int = 768,
        num_chexpert: int = 14,
        pretrained_vision: bool = True,
    ):
        super().__init__()
        self.vision = VisualEncoder(embed_dim, pretrained_vision)
        self.llm = GPT2LMHeadModel.from_pretrained(lm_name)

        # BioGPT uses hidden_size, GPT-2 uses n_embd
        lm_dim = getattr(self.llm.config, "hidden_size", None) \
                 or getattr(self.llm.config, "n_embd", None)

        self.vis_to_lm = nn.Linear(embed_dim, lm_dim) if embed_dim != lm_dim else nn.Identity()

        self.img_bos = nn.Parameter(torch.zeros(1, 1, lm_dim))
        nn.init.trunc_normal_(self.img_bos, std=0.02)

        # cls_head operates on RAW vision features (embed_dim = 768)
        self.cls_head = nn.Sequential(
            nn.Linear(embed_dim, 256), nn.GELU(), nn.Dropout(0.2),
            nn.Linear(256, num_chexpert),
        )

        self.num_visual_tokens = 49

    def _visual_prefix(self, pixel_values):
        vis_raw = self.vision(pixel_values)          # (B, 49, 768)
        vis = self.vis_to_lm(vis_raw)                # (B, 49, 1024) for BioGPT
        bos = self.img_bos.expand(vis.size(0), -1, -1)
        pooled = vis_raw.mean(dim=1)                 # (B, 768) ← matches cls_head
        return vis, bos, pooled

    def forward(self, pixel_values, input_ids, attention_mask, labels=None):
        vis, bos, pooled = self._visual_prefix(pixel_values)
        txt = self.llm.get_input_embeddings()(input_ids)

        inputs_embeds = torch.cat([vis, bos, txt], dim=1)
        B, P = vis.size(0), vis.size(1) + 1

        vis_mask = torch.ones(B, P, dtype=attention_mask.dtype, device=attention_mask.device)
        attn = torch.cat([vis_mask, attention_mask], dim=1)

        if labels is not None:
            pad = torch.full((B, P), -100, dtype=labels.dtype, device=labels.device)
            labels = torch.cat([pad, labels], dim=1)

        out = self.llm(inputs_embeds=inputs_embeds, attention_mask=attn, labels=labels)
        logits_cls = self.cls_head(pooled)
        return out.loss, logits_cls, out.logits

    @torch.no_grad()
    def generate_report(
        self,
        pixel_values,
        tokenizer,
        max_new_tokens: int = 180,
        num_beams: int = 1,
        repetition_penalty: float = 1.25,
        no_repeat_ngram_size: int = 4,
    ) -> str:
        self.eval()
        vis, bos, pooled = self._visual_prefix(pixel_values)

        # ---- Text prompt: gives BioGPT direction to continue ----
        prompt_text = "Findings:"
        prompt_ids = tokenizer(
            prompt_text, return_tensors="pt", add_special_tokens=False
        ).input_ids.to(pixel_values.device)
        prompt_embeds = self.llm.get_input_embeddings()(prompt_ids)

        inputs_embeds = torch.cat([vis, bos, prompt_embeds], dim=1)

        # ---- Generate with explicit EOS so BioGPT doesn't stop immediately ----
        out = self.llm.generate(
            inputs_embeds=inputs_embeds,
            max_new_tokens=max_new_tokens,
            num_beams=num_beams,
            repetition_penalty=repetition_penalty,
            no_repeat_ngram_size=no_repeat_ngram_size,
            early_stopping=True,
            eos_token_id=tokenizer.eos_token_id,     # only </s>, not <s>
            pad_token_id=tokenizer.pad_token_id,
        )

        # `out` contains only the newly generated tokens (no input prefix)
        text = tokenizer.decode(out[0], skip_special_tokens=True)

        # Re-prepend "Findings:" so the split_report can find the header
        if not text.strip().lower().startswith("findings"):
            text = "Findings: " + text.strip()

        probs = torch.sigmoid(pooled)[0].cpu().numpy()
        return text, probs