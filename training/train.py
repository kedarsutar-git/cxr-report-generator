"""
train.py
6 GB VRAM optimised training for CXR report generation.

Run from training/ folder:
    python train.py
"""

import argparse
import math
import sys
import time
from pathlib import Path

import torch
import torch.nn as nn
from torch.optim import AdamW
from torch.utils.data import DataLoader
from transformers import AutoTokenizer, get_cosine_schedule_with_warmup

# Make backend importable
sys.path.append(str(Path(__file__).resolve().parent.parent / "backend"))

from app.model.architecture import CXRReportModel
from dataset import CXRReportDataset


# ------------------------------------------------------------------
# TRAINING CONFIG (tuned for RTX 3050 6GB)
# ------------------------------------------------------------------
DEFAULTS = {
    "train_ann": "../Data/iu_xray/annotations/train.json",
    "val_ann": "../Data/iu_xray/annotations/val.json",
    "image_root": "../Data/iu_xray/images",
    "out": "../backend/weights/best.pt",
    "lm_name": "gpt2",
    "epochs": 12,
    "bs": 2,                   # physical batch size (small for 6GB)
    "grad_accum": 8,           # effective batch = 2 x 8 = 16
    "max_len": 200,
    "lr_vision": 3e-4,         # was 5e-5  (6x higher, forces vision to learn)
    "lr_lm": 1e-4,             # was 2e-4  (lower, LM shouldn't dominate)
    "lambda_cls": 1.0,         # was 0.3   (3x stronger, forces image-aware labels)
    "workers": 2,
    "lora": True,
    "amp": True,
    "grad_checkpoint": True,
}

def parse_args():
    p = argparse.ArgumentParser()
    for k, v in DEFAULTS.items():
        if isinstance(v, bool):
            p.add_argument(f"--{k}", action="store_true", default=v)
        else:
            p.add_argument(f"--{k}", type=type(v), default=v)
    return p.parse_args()


def build_lora(model):
    """Apply LoRA to GPT-2 attention layers -- trains ~1M params instead of 124M."""
    try:
        from peft import LoraConfig, get_peft_model
    except ImportError:
        print("[warn] peft not installed, skipping LoRA")
        return model

    cfg = LoraConfig(
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        target_modules=["c_attn"],
        bias="none",
        task_type="CAUSAL_LM",
    )
    model.llm = get_peft_model(model.llm, cfg)
    model.llm.print_trainable_parameters()
    return model


def main(a):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[train] device = {device}")
    if device.type == "cuda":
        print(f"[train] GPU    = {torch.cuda.get_device_name(0)}")
        print(f"[train] VRAM   = {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")

    # ---- tokenizer ----
    tokenizer = AutoTokenizer.from_pretrained(a.lm_name)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # ---- data ----
    train_ds = CXRReportDataset(a.train_ann, a.image_root, tokenizer, a.max_len, True)
    val_ds = CXRReportDataset(a.val_ann, a.image_root, tokenizer, a.max_len, False)

    train_dl = DataLoader(
        train_ds, batch_size=a.bs, shuffle=True,
        num_workers=a.workers, pin_memory=True, drop_last=True,
    )
    val_dl = DataLoader(
        val_ds, batch_size=a.bs, shuffle=False,
        num_workers=a.workers, pin_memory=True,
    )

    # ---- model ----
    model = CXRReportModel(lm_name=a.lm_name).to(device)

    if a.lora:
        model = build_lora(model)

    if a.grad_checkpoint:
        try:
            model.llm.gradient_checkpointing_enable()
            print("[train] gradient checkpointing enabled")
        except Exception as e:
            print(f"[warn] grad checkpointing unavailable: {e}")

    # ---- optimiser: separate LR for vision vs LM ----
    vision_params = (
        list(model.vision.parameters())
        + list(model.cls_head.parameters())
        + [model.img_bos]
        + list(model.vis_to_lm.parameters())
    )
    lm_params = [p for p in model.llm.parameters() if p.requires_grad]

    optimizer = AdamW(
        [
            {"params": vision_params, "lr": a.lr_vision},
            {"params": lm_params, "lr": a.lr_lm},
        ],
        weight_decay=0.01,
    )

    # ---- scheduler ----
    steps_per_epoch = math.ceil(len(train_dl) / a.grad_accum)
    total_steps = steps_per_epoch * a.epochs
    warmup_steps = int(total_steps * 0.05)
    sched = get_cosine_schedule_with_warmup(optimizer, warmup_steps, total_steps)

    # ---- AMP scaler ----
    scaler = torch.amp.GradScaler("cuda", enabled=(a.amp and device.type == "cuda"))
    bce = nn.BCEWithLogitsLoss()

    # ---- resume if checkpoint exists ----
    start_epoch = 0
    best_val = math.inf
    out_path = Path(a.out)
    if out_path.exists():
        print(f"[train] resuming from {out_path}")
        ckpt = torch.load(out_path, map_location="cpu")
        model.load_state_dict(ckpt["model"], strict=False)
        start_epoch = ckpt.get("epoch", 0) + 1
        best_val = ckpt.get("best_val", math.inf)
        print(f"[train] resumed at epoch {start_epoch}, best_val={best_val:.4f}")

    # ==================================================================
    # TRAINING LOOP
    # ==================================================================
    for epoch in range(start_epoch, a.epochs):
        model.train()
        epoch_loss = 0.0
        t0 = time.time()
        optimizer.zero_grad(set_to_none=True)

        for step, batch in enumerate(train_dl):
            px = batch["pixel_values"].to(device, non_blocking=True)
            ids = batch["input_ids"].to(device, non_blocking=True)
            am = batch["attention_mask"].to(device, non_blocking=True)
            lb = batch["labels"].to(device, non_blocking=True)
            cx = batch["chexpert"].to(device, non_blocking=True)

            with torch.amp.autocast("cuda", enabled=(a.amp and device.type == "cuda")):
                lm_loss, cls_logits, _ = model(px, ids, am, lb)
                loss = (lm_loss + a.lambda_cls * bce(cls_logits, cx)) / a.grad_accum

            scaler.scale(loss).backward()

            if (step + 1) % a.grad_accum == 0 or (step + 1) == len(train_dl):
                scaler.unscale_(optimizer)
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                scaler.step(optimizer)
                scaler.update()
                sched.step()
                optimizer.zero_grad(set_to_none=True)

            epoch_loss += loss.item() * a.grad_accum

            if step % 20 == 0:
                mem = torch.cuda.max_memory_allocated() / 1e9 if device.type == "cuda" else 0
                print(
                    f"  ep{epoch} [{step}/{len(train_dl)}] "
                    f"loss={loss.item() * a.grad_accum:.4f} "
                    f"lm={lm_loss.item():.4f} "
                    f"vram={mem:.2f}GB"
                )

        avg_train = epoch_loss / len(train_dl)
        print(f"\n[epoch {epoch}] train_loss={avg_train:.4f}  ({time.time() - t0:.0f}s)")

        # ---- validation ----
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for batch in val_dl:
                px = batch["pixel_values"].to(device)
                ids = batch["input_ids"].to(device)
                am = batch["attention_mask"].to(device)
                lb = batch["labels"].to(device)
                cx = batch["chexpert"].to(device)

                with torch.amp.autocast("cuda", enabled=(a.amp and device.type == "cuda")):
                    lm_loss, cls_logits, _ = model(px, ids, am, lb)
                    val_loss += (lm_loss + a.lambda_cls * bce(cls_logits, cx)).item()

        val_loss /= max(len(val_dl), 1)
        print(f"[epoch {epoch}] val_loss={val_loss:.4f}")

        # ---- save best ----
        if val_loss < best_val:
            best_val = val_loss
            out_path.parent.mkdir(parents=True, exist_ok=True)
            torch.save({
                "model": model.state_dict(),
                "epoch": epoch,
                "best_val": best_val,
                "version": f"v1.0-ep{epoch}",
            }, out_path)
            print(f"  saved -> {out_path} (best_val={best_val:.4f})")

    print(f"\n[train] done. best val loss = {best_val:.4f}")


if __name__ == "__main__":
    main(parse_args())