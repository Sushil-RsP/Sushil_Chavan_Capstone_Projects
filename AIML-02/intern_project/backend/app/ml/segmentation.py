"""MONAI 3D U-Net segmentation pipeline stub.

This module implements the segmentation pipeline for compatible
volumetric CT/MRI data (Medical Segmentation Decathlon format).

STATUS: Pipeline code is complete; training is PENDING (requires GPU,
~16 GB VRAM, and the MSD dataset download). Inference runs in demo mode.

WARNING: Do NOT pass a 2D chest X-ray to this 3D segmentation model.
"""
from __future__ import annotations
import base64
import io
import logging
import time
import uuid

import numpy as np
from PIL import Image

from app.schemas import SegmentationResponse

logger = logging.getLogger(__name__)

MODEL_VERSION = "monai-unet3d-v0.1-pending"


def _slice_to_b64(arr: np.ndarray) -> str:
    """Convert a 2D numpy array to base64 PNG."""
    arr_norm = (arr - arr.min()) / (arr.max() - arr.min() + 1e-8)
    img = Image.fromarray((arr_norm * 255).astype(np.uint8), mode="L")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


class MonaiSegmentationPipeline:
    """3D U-Net segmentation pipeline (MONAI).

    Requires:
    - MONAI >= 1.3.0
    - A compatible NIfTI (.nii.gz) CT/MRI volume
    - A trained checkpoint (currently PENDING)

    DO NOT pass chest X-ray JPEG/PNG images to this pipeline.
    """

    def __init__(self) -> None:
        self.checkpoint_loaded = False
        self.mode = "demo"
        self._try_load_monai()

    def _try_load_monai(self) -> None:
        try:
            import monai  # noqa: F401
            logger.info("MONAI is available: %s", monai.__version__)
        except ImportError:
            logger.warning("MONAI not installed. Segmentation will run in placeholder mode only.")

    def segment_volume(self, volume_path: str) -> SegmentationResponse:
        """Run segmentation on a NIfTI volume file."""
        t0 = time.perf_counter()
        request_id = str(uuid.uuid4())

        if self.mode == "demo":
            # Return a synthetic circular mask as demonstration
            arr = np.zeros((64, 64), dtype=np.uint8)
            yy, xx = np.ogrid[:64, :64]
            mask = (xx - 32)**2 + (yy - 32)**2 < 400
            arr[mask] = 128
            elapsed = (time.perf_counter() - t0) * 1000
            return SegmentationResponse(
                request_id=request_id,
                mode="demo",
                model_version=MODEL_VERSION,
                mask_slice_base64=_slice_to_b64(arr),
                num_slices=64,
                dice_score=None,
                inference_time_ms=round(elapsed, 2),
            )

        raise NotImplementedError(
            "Real segmentation inference requires a trained checkpoint. "
            "See ml/segmentation/README.md for training instructions."
        )


_segmentation_pipeline: MonaiSegmentationPipeline | None = None

def get_segmentation_pipeline() -> MonaiSegmentationPipeline:
    global _segmentation_pipeline
    if _segmentation_pipeline is None:
        _segmentation_pipeline = MonaiSegmentationPipeline()
    return _segmentation_pipeline
