"""
merge_lora.py
Merges trained LoRA weights into base GPT-2 and saves a plain checkpoint.
Run ONCE from the training folder:
    python merge_lora.py
"""

import sys
from pathlib import Path
import torch

sys.path.append(str(Path(__file__).resolve().parent.parent / "backend"))

from app.model.architecture import CXRReportModel
from peft import LoraConfig, get_peft_model

# ------------------------------------------------------------------
CKPT_IN  = Path("../backend/weights/best.pt")
CKPT_OUT = Path("../backend/weights/best_merged.pt")
# ------------------------------------------------------------------

print(f"Loading trained checkpoint: {CKPT_IN}")
ckpt = torch.load(CKPT_IN, map_location="cpu")
sd = ckpt["model"] if isinstance(ckpt, dict) and "model" in ckpt else ckpt
print(f"  keys in checkpoint: {len(sd)}")
print(f"  has LoRA weights: {any('lora_' in k for k in sd.keys())}")

print("Building model with LoRA wrapper...")
model = CXRReportModel(lm_name="gpt2")
cfg = LoraConfig(
    r=16, lora_alpha=32, lora_dropout=0.05,
    target_modules=["c_attn"], bias="none", task_type="CAUSAL_LM",
)
model.llm = get_peft_model(model.llm, cfg)

missing, unexpected = model.load_state_dict(sd, strict=False)
print(f"  missing keys:    {len(missing)}")
print(f"  unexpected keys: {len(unexpected)}")

print("Merging LoRA into base model...")
model.llm = model.llm.merge_and_unload()

print(f"Saving merged checkpoint: {CKPT_OUT}")
torch.save({
    "model": model.state_dict(),
    "version": ckpt.get("version", "v1.0") + "-merged",
}, CKPT_OUT)
print("Done.")