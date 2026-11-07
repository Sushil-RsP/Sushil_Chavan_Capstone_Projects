"""Segmentation endpoint (MONAI 3D U-Net — demo/pending)."""
import logging
from fastapi import APIRouter, File, HTTPException, UploadFile
from app.ml.segmentation import get_segmentation_pipeline
from app.schemas import SegmentationResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["segmentation"])


@router.post("/segment", response_model=SegmentationResponse)
async def segment(file: UploadFile = File(...)):
    """
    Upload a NIfTI (.nii.gz) CT/MRI volume for 3D segmentation.
    
    ⚠️ Do NOT upload chest X-ray images here.
    Training is PENDING — returns demo output until a checkpoint is loaded.
    """
    if file.filename and not (
        file.filename.endswith(".nii") or file.filename.endswith(".nii.gz")
    ):
        raise HTTPException(
            422,
            "Only NIfTI (.nii or .nii.gz) volumes are accepted by the segmentation endpoint. "
            "For chest X-ray classification use /api/v1/classify instead."
        )
    pipeline = get_segmentation_pipeline()
    try:
        result = pipeline.segment_volume(file.filename or "uploaded.nii.gz")
    except Exception as exc:
        logger.exception("Segmentation failed")
        raise HTTPException(500, str(exc)) from exc
    return result
