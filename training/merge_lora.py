"""
merge_lora.py
Merges trained LoRA weights into base BioGPT and saves a plain checkpoint.

Run ONCE from the training folder (after train.py finishes):
    python merge_lora.py

Produces: ../backend/weights/best_merged.pt
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
if not CKPT_IN.exists():
    raise FileNotFoundError(
        f"{CKPT_IN} not found. Did you run `python train.py` first?"
    )

ckpt = torch.load(CKPT_IN, map_location="cpu")
sd = ckpt["model"] if isinstance(ckpt, dict) and "model" in ckpt else ckpt
print(f"  keys in checkpoint: {len(sd)}")

has_lora = any("lora_" in k for k in sd.keys())
print(f"  has LoRA weights: {has_lora}")

if not has_lora:
    print("  [warn] No LoRA keys found — checkpoint may already be merged or untrained.")

print("Building model with LoRA wrapper...")
model = CXRReportModel(lm_name="microsoft/biogpt")

# Same LoRA config used during training — MUST match, or weights won't load
cfg = LoraConfig(
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    target_modules=["q_proj", "v_proj"],
    bias="none",
    task_type="CAUSAL_LM",
)
model.llm = get_peft_model(model.llm, cfg)

missing, unexpected = model.load_state_dict(sd, strict=False)
print(f"  missing keys:    {len(missing)}")
print(f"  unexpected keys: {len(unexpected)}")

if missing:
    print("  [warn] Sample missing keys:", missing[:3])
if unexpected:
    print("  [warn] Sample unexpected keys:", unexpected[:3])

print("Merging LoRA into base model...")
model.llm = model.llm.merge_and_unload()

print(f"Saving merged checkpoint: {CKPT_OUT}")
torch.save({
    "model": model.state_dict(),
    "version": ckpt.get("version", "v1.0") + "-merged",
}, CKPT_OUT)
print("Done. Restart the backend to load the new weights.")