"""
gradcam_utils.py
Overlay a Grad-CAM heatmap on the original X-ray image.
"""

import base64
import io
import numpy as np
from PIL import Image

import matplotlib
matplotlib.use("Agg")   # non-interactive backend
import matplotlib.pyplot as plt


def make_overlay(image_bytes: bytes, cam_7x7: np.ndarray, alpha: float = 0.5,
                 display_size: tuple = (400, 400)) -> str:
    """
    Blend the CAM with the input image and return a base64 PNG data URL.

    Args:
        image_bytes: original uploaded file bytes
        cam_7x7:     numpy array of shape (7, 7), values in [0, 1]
        alpha:       heatmap opacity (0 = transparent, 1 = opaque)
    Returns:
        "data:image/png;base64,..." string
    """
    # 1. Load original image
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize(display_size, Image.LANCZOS)

    # 2. Upsample 7x7 CAM to display_size
    cam_img = Image.fromarray((cam_7x7 * 255).astype(np.uint8), mode="L")
    cam_img = cam_img.resize(display_size, Image.BICUBIC)
    cam = np.array(cam_img) / 255.0                    # 0-1

    # 3. Apply jet colormap
    try:
        cmap = matplotlib.colormaps["jet"]             # matplotlib >= 3.5
    except (AttributeError, KeyError):
        cmap = plt.get_cmap("jet")                     # older matplotlib

    heatmap = cmap(cam)[:, :, :3]                      # (H, W, 3), 0-1
    heatmap = (heatmap * 255).astype(np.uint8)

    # 4. Blend with original
    img_arr = np.array(img).astype(np.float32)
    blended = img_arr * (1 - alpha) + heatmap.astype(np.float32) * alpha
    blended = np.clip(blended, 0, 255).astype(np.uint8)

    # 5. Encode as base64 PNG
    out_img = Image.fromarray(blended)
    buf = io.BytesIO()
    out_img.save(buf, format="PNG", optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

    return f"data:image/png;base64,{b64}"