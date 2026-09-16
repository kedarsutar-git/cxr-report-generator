"""
dataset.py
PyTorch Dataset for IU X-Ray report generation.
"""

import json
from pathlib import Path

import torch
from PIL import Image
from torch.utils.data import Dataset
from torchvision import transforms

MEAN = [0.485, 0.456, 0.406]
STD = [0.229, 0.224, 0.225]

train_transform = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.RandomCrop(224),
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomRotation(7),
    transforms.ColorJitter(brightness=0.15, contrast=0.15),
    transforms.ToTensor(),
    transforms.Normalize(MEAN, STD),
])

eval_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(MEAN, STD),
])


class CXRReportDataset(Dataset):
    def __init__(self, ann_path, image_root, tokenizer, max_len=200, train=True):
        self.items = json.loads(Path(ann_path).read_text(encoding="utf-8"))
        self.root = Path(image_root)
        self.tok = tokenizer
        self.max_len = max_len
        self.tf = train_transform if train else eval_transform
        print(f"[dataset] {ann_path}: {len(self.items)} records")

    def __len__(self):
        return len(self.items)

    def _load_image(self, filename):
        path = self.root / filename
        if not path.exists():
            for ext in [".png", ".jpg", ".jpeg"]:
                alt = self.root / (Path(filename).stem + ext)
                if alt.exists():
                    path = alt
                    break
            else:
                raise FileNotFoundError(f"Image not found: {path}")

        img = Image.open(path)
        if img.mode in ("I;16", "I", "L"):
            import numpy as np
            arr = np.array(img).astype("float32")
            arr = (arr - arr.min()) / (arr.max() - arr.min() + 1e-8) * 255.0
            img = Image.fromarray(arr.astype("uint8"))
        return img.convert("RGB")

    def __getitem__(self, idx):
        item = self.items[idx]
        pixel_values = self.tf(self._load_image(item["image"]))

        enc = self.tok(
            item["report"],
            truncation=True,
            max_length=self.max_len,
            padding="max_length",
            return_tensors="pt",
        )
        input_ids = enc.input_ids[0]
        attention_mask = enc.attention_mask[0]

        labels = input_ids.clone()
        labels[attention_mask == 0] = -100

        chexpert = torch.tensor(item.get("labels", [0] * 14), dtype=torch.float32)

        return {
            "pixel_values": pixel_values,
            "input_ids": input_ids,
            "attention_mask": attention_mask,
            "labels": labels,
            "chexpert": chexpert,
        }