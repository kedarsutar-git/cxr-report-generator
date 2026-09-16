import io
import numpy as np
import torch
from PIL import Image
from torchvision import transforms

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD  = [0.229, 0.224, 0.225]

_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
])

def load_xray(image_bytes: bytes) -> torch.Tensor:
    img = Image.open(io.BytesIO(image_bytes))

    if img.mode in ("I;16", "I", "L"):
        arr = np.array(img).astype(np.float32)
        arr = (arr - arr.min()) / (arr.max() - arr.min() + 1e-8) * 255.0
        img = Image.fromarray(arr.astype(np.uint8))
    img = img.convert("RGB")

    return _transform(img).unsqueeze(0)