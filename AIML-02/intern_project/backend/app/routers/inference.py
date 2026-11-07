"""Classification and Grad-CAM inference endpoints."""
from __future__ import annotations
import logging
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from app.config import settings
from app.ml.classifier import get_classifier
from app.ml.gradcam import get_gradcam
from app.ml.preprocess import validate_image
from app.schemas import ClassificationResponse, GradCAMResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["inference"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/bmp", "image/tiff"}
MAX_FILENAME_LEN = 255


def _check_upload(file: UploadFile) -> None:
    if file.filename and len(file.filename) > MAX_FILENAME_LEN:
        raise HTTPException(400, "Filename too long.")


@router.post("/classify", response_model=ClassificationResponse)
async def classify(file: UploadFile = File(...)):
    """Upload a chest X-ray image (JPEG/PNG) for multi-label classification."""
    _check_upload(file)
    data = await file.read()
    try:
        validate_image(data, max_bytes=settings.max_upload_bytes)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    try:
        result = get_classifier().predict(data, filename=file.filename or "")
    except Exception as exc:
        logger.exception("Classification failed")
        raise HTTPException(500, f"Inference error: {exc}") from exc
    return result


@router.post("/gradcam", response_model=GradCAMResponse)
async def gradcam(
    file: UploadFile = File(...),
    target_label: str | None = Form(default=None),
):
    """Generate Grad-CAM heatmap for an uploaded chest X-ray."""
    _check_upload(file)
    data = await file.read()
    try:
        validate_image(data, max_bytes=settings.max_upload_bytes)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    try:
        result = get_gradcam().generate(data, target_label=target_label, filename=file.filename or "")
    except Exception as exc:
        logger.exception("Grad-CAM failed")
        raise HTTPException(500, f"Grad-CAM error: {exc}") from exc
    return result
