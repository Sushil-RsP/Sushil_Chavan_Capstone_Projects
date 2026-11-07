"""Image preprocessing utilities for chest X-ray classification."""
from __future__ import annotations
import io
import logging
from pathlib import Path
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# NIH ChestX-ray14 normalisation statistics (ImageNet proxy)
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD  = [0.229, 0.224, 0.225]

try:
    import torch
    from torchvision import transforms
    TORCH_AVAILABLE = True
    CLASSIFICATION_TRANSFORM = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])
except (ImportError, OSError) as exc:
    TORCH_AVAILABLE = False
    torch = None
    transforms = None
    CLASSIFICATION_TRANSFORM = None
    logger.warning("Torch/torchvision unavailable in preprocess (%s). Using PIL fallback.", exc)


def load_image_from_bytes(data: bytes) -> Image.Image:
    """Load a PIL image from raw bytes, convert to RGB."""
    try:
        img = Image.open(io.BytesIO(data))
        img = img.convert("RGB")
        return img
    except Exception as exc:
        raise ValueError(f"Cannot decode image: {exc}") from exc


def preprocess_for_classification(img: Image.Image):
    """Return a (1, 3, 224, 224) float tensor or numpy array ready for DenseNet121."""
    if TORCH_AVAILABLE and CLASSIFICATION_TRANSFORM is not None:
        tensor = CLASSIFICATION_TRANSFORM(img)
        return tensor.unsqueeze(0)
    
    # Pure PIL / NumPy fallback
    w, h = img.size
    scale = 256.0 / min(w, h)
    new_w, new_h = int(w * scale), int(h * scale)
    img_resized = img.resize((new_w, new_h), resample=Image.BILINEAR)
    left = (new_w - 224) // 2
    top = (new_h - 224) // 2
    img_cropped = img_resized.crop((left, top, left + 224, top + 224))
    
    arr = np.array(img_cropped, dtype=np.float32) / 255.0
    for c in range(3):
        arr[:, :, c] = (arr[:, :, c] - IMAGENET_MEAN[c]) / IMAGENET_STD[c]
    arr = np.transpose(arr, (2, 0, 1))
    return np.expand_dims(arr, axis=0)


def validate_image(data: bytes, max_bytes: int = 50 * 1024 * 1024) -> None:
    """Raise ValueError for oversized or corrupt inputs."""
    if len(data) == 0:
        raise ValueError("Empty file uploaded.")
    if len(data) > max_bytes:
        raise ValueError(f"File exceeds maximum size of {max_bytes // (1024*1024)} MB.")
    try:
        load_image_from_bytes(data)
    except Exception as exc:
        raise ValueError(f"Cannot open image: {exc}") from exc
