"""Grad-CAM implementation for DenseNet121 with anatomical localization fallbacks."""
from __future__ import annotations
import base64
import io
import logging
import time
import uuid
from typing import Optional, Any

import numpy as np
from PIL import Image

try:
    import torch
    import torch.nn as nn
    TORCH_AVAILABLE = True
except (ImportError, OSError):
    TORCH_AVAILABLE = False
    torch = None
    nn = None

try:
    import cv2
    CV2_AVAILABLE = True
except (ImportError, OSError):
    CV2_AVAILABLE = False
    cv2 = None

from app.config import settings
from app.ml.classifier import get_classifier, analyze_radiographic_features
from app.ml.preprocess import load_image_from_bytes, preprocess_for_classification
from app.schemas import GradCAMResponse

logger = logging.getLogger(__name__)


def _apply_jet_colormap_numpy(gray_norm: np.ndarray) -> np.ndarray:
    """Pure NumPy Jet colormap implementation."""
    r = np.clip(1.5 - np.abs(4 * gray_norm - 3), 0, 1)
    g = np.clip(1.5 - np.abs(4 * gray_norm - 2), 0, 1)
    b = np.clip(1.5 - np.abs(4 * gray_norm - 1), 0, 1)
    return np.uint8(np.dstack([r, g, b]) * 255)


def _make_heatmap_overlay(
    original_rgb: np.ndarray, cam: np.ndarray
) -> tuple[np.ndarray, np.ndarray]:
    """Return (heatmap_rgb, overlay_rgb) both (H,W,3) uint8."""
    h, w = original_rgb.shape[:2]

    if CV2_AVAILABLE and cv2 is not None:
        cam_resized = cv2.resize(cam, (w, h))
        cam_norm = (cam_resized - cam_resized.min()) / (cam_resized.max() - cam_resized.min() + 1e-8)
        heatmap = cv2.applyColorMap(np.uint8(255 * cam_norm), cv2.COLORMAP_JET)
        heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
        overlay = cv2.addWeighted(original_rgb, 0.6, heatmap, 0.4, 0)
    else:
        cam_img = Image.fromarray(cam).resize((w, h), resample=Image.BILINEAR)
        cam_resized = np.array(cam_img, dtype=np.float32)
        cam_norm = (cam_resized - cam_resized.min()) / (cam_resized.max() - cam_resized.min() + 1e-8)
        heatmap = _apply_jet_colormap_numpy(cam_norm)
        overlay = np.uint8(0.6 * original_rgb + 0.4 * heatmap)

    return heatmap, overlay


def _img_to_b64(arr: np.ndarray) -> str:
    """Encode (H,W,3) uint8 numpy array as base64-encoded PNG string."""
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


class GradCAMExtractor:
    """Grad-CAM for DenseNet121 features with anatomical localization fallbacks."""

    TARGET_LAYER = "features.denseblock4"

    def __init__(self) -> None:
        self.classifier = get_classifier()
        self._gradients: Optional[Any] = None
        self._activations: Optional[Any] = None
        self._hook_handles: list = []

    def _register_hooks(self, model: Any) -> None:
        self._hook_handles = []
        for name, module in model.named_modules():
            if name == self.TARGET_LAYER:
                self._hook_handles.append(
                    module.register_forward_hook(self._save_activation)
                )
                self._hook_handles.append(
                    module.register_full_backward_hook(self._save_gradient)
                )
                break

    def _save_activation(self, module, inp, out):
        self._activations = out.detach()

    def _save_gradient(self, module, grad_in, grad_out):
        self._gradients = grad_out[0].detach()

    def _remove_hooks(self) -> None:
        for h in self._hook_handles:
            h.remove()
        self._hook_handles = []

    def generate(
        self, image_bytes: bytes, target_label: Optional[str] = None, filename: str = ""
    ) -> GradCAMResponse:
        t0 = time.perf_counter()
        request_id = str(uuid.uuid4())
        classifier = self.classifier

        if classifier.mode == "demo" or not TORCH_AVAILABLE or classifier.model is None:
            img = load_image_from_bytes(image_bytes)
            orig_rgb = np.array(img.resize((224, 224)))
            h, w = orig_rgb.shape[:2]
            y, x = np.mgrid[0:h, 0:w]

            _, (fx, fy), detected = analyze_radiographic_features(image_bytes, filename=filename)
            target = target_label or detected or "No Finding"

            if target in ("Pneumonia", "Consolidation", "Infiltration", "Mass", "Nodule"):
                cx, cy = int(fx * w), int(fy * h)
                spread = max(18, int(w * 0.16))
            elif target == "Cardiomegaly":
                cx, cy = int(0.48 * w), int(0.64 * h)
                spread = int(w * 0.22)
            elif target == "Effusion":
                cx, cy = int(fx * w), int(0.80 * h)
                spread = int(w * 0.18)
            elif target == "Pneumothorax":
                cx, cy = int(fx * w if fx != 0.5 else 0.28 * w), int(0.26 * h)
                spread = int(w * 0.16)
            elif target == "Edema":
                cx, cy = int(0.50 * w), int(0.52 * h)
                spread = int(w * 0.24)
            elif target == "Emphysema":
                cx, cy = int(0.50 * w), int(0.40 * h)
                spread = int(w * 0.26)
            elif target == "Atelectasis":
                cx, cy = int(fx * w), int(0.68 * h)
                spread = int(w * 0.16)
            else:
                cx, cy = int(w // 2), int(h // 2)
                spread = int(w // 4)

            cam = np.exp(-((x - cx)**2 + (y - cy)**2) / (2.0 * spread**2)).astype(np.float32)
            heatmap, overlay = _make_heatmap_overlay(orig_rgb, cam)
            elapsed = (time.perf_counter() - t0) * 1000
            return GradCAMResponse(
                request_id=request_id,
                mode="demo",
                model_version="densenet121-v0.1-demo",
                heatmap_base64=_img_to_b64(heatmap),
                overlay_base64=_img_to_b64(overlay),
                target_label=target,
                inference_time_ms=round(elapsed, 2),
            )

        model = classifier.model
        labels = classifier.labels
        if target_label is None or target_label not in labels:
            target_label = labels[0]
        target_idx = labels.index(target_label)

        img = load_image_from_bytes(image_bytes)
        orig_rgb = np.array(img.resize((224, 224)))
        tensor = preprocess_for_classification(img).to(classifier.device)
        tensor.requires_grad_(True)

        self._register_hooks(model)
        try:
            model.zero_grad()
            logits = model(tensor)
            score = logits[0, target_idx]
            score.backward()
        finally:
            self._remove_hooks()

        grads = self._gradients
        acts  = self._activations

        if grads is None or acts is None:
            raise RuntimeError("Grad-CAM hooks did not fire — check target layer name.")

        weights = grads.mean(dim=(2, 3), keepdim=True)
        cam = (weights * acts).sum(dim=1).squeeze().cpu().numpy()
        cam = np.maximum(cam, 0)

        heatmap, overlay = _make_heatmap_overlay(orig_rgb, cam)
        elapsed = (time.perf_counter() - t0) * 1000
        return GradCAMResponse(
            request_id=request_id,
            mode="inference",
            model_version="densenet121-v0.1-demo",
            heatmap_base64=_img_to_b64(heatmap),
            overlay_base64=_img_to_b64(overlay),
            target_label=target_label,
            inference_time_ms=round(elapsed, 2),
        )


_gradcam: GradCAMExtractor | None = None

def get_gradcam() -> GradCAMExtractor:
    global _gradcam
    if _gradcam is None:
        _gradcam = GradCAMExtractor()
    return _gradcam
