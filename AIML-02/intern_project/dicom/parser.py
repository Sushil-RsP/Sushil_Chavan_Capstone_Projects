"""Safe DICOM file parser, photometric normalizer, and de-identification tool."""
from __future__ import annotations
import io
import logging
from typing import Tuple, Dict, Any, Optional
import numpy as np
from PIL import Image

try:
    import pydicom
    from pydicom.dataset import Dataset
    PYDICOM_AVAILABLE = True
except ImportError:
    PYDICOM_AVAILABLE = False

logger = logging.getLogger(__name__)

# Standard tags to redact for HIPAA Safe Harbor de-identification
TAGS_TO_ANONYMIZE = [
    (0x0010, 0x0010),  # PatientName
    (0x0010, 0x0020),  # PatientID
    (0x0010, 0x0030),  # PatientBirthDate
    (0x0010, 0x0040),  # PatientSex
    (0x0010, 0x1040),  # PatientAddress
    (0x0008, 0x0080),  # InstitutionName
    (0x0008, 0x0081),  # InstitutionAddress
    (0x0008, 0x0090),  # ReferringPhysicianName
]


def parse_dicom_file(data: bytes) -> Tuple[np.ndarray, Dict[str, Any]]:
    """Parse raw DICOM byte stream safely and return (pixel_array, metadata).
    
    Accounts for Photometric Interpretation, Rescale Slope/Intercept,
    and returns a normalized uint8 array suitable for image processing.
    """
    if not PYDICOM_AVAILABLE:
        raise ImportError("pydicom library is required for DICOM parsing.")

    try:
        ds: Dataset = pydicom.dcmread(io.BytesIO(data), force=True)
    except Exception as exc:
        raise ValueError(f"Failed to read DICOM binary stream: {exc}") from exc

    metadata = {
        "Modality": getattr(ds, "Modality", "UNKNOWN"),
        "StudyInstanceUID": getattr(ds, "StudyInstanceUID", "UNKNOWN"),
        "SeriesInstanceUID": getattr(ds, "SeriesInstanceUID", "UNKNOWN"),
        "SOPInstanceUID": getattr(ds, "SOPInstanceUID", "UNKNOWN"),
        "PhotometricInterpretation": getattr(ds, "PhotometricInterpretation", "MONOCHROME2"),
        "Rows": getattr(ds, "Rows", 0),
        "Columns": getattr(ds, "Columns", 0),
    }

    try:
        pixels = ds.pixel_array.astype(np.float32)
    except Exception as exc:
        raise ValueError(f"Could not decode DICOM pixel array. Format or transfer syntax may require GDCM/pylibjpeg: {exc}") from exc

    # Apply Rescale Slope & Intercept if present (common in CT/CR)
    slope = float(getattr(ds, "RescaleSlope", 1.0))
    intercept = float(getattr(ds, "RescaleIntercept", 0.0))
    if slope != 1.0 or intercept != 0.0:
        pixels = pixels * slope + intercept

    # Handle Photometric Interpretation: MONOCHROME1 has 0 as bright white, so invert
    photometric = getattr(ds, "PhotometricInterpretation", "MONOCHROME2")
    if photometric == "MONOCHROME1":
        pixels = np.amax(pixels) - pixels

    normalized = normalize_dicom_pixels(pixels)
    return normalized, metadata


def normalize_dicom_pixels(pixels: np.ndarray) -> np.ndarray:
    """Normalize arbitrary float dynamic range into [0, 255] uint8 array."""
    p_min = np.amin(pixels)
    p_max = np.amax(pixels)
    if p_max - p_min > 1e-6:
        norm = (pixels - p_min) / (p_max - p_min)
    else:
        norm = np.zeros_like(pixels)
    return np.uint8(np.clip(norm * 255.0, 0, 255))


def dicom_to_pil_image(data: bytes) -> Image.Image:
    """Convert DICOM bytes directly into a 3-channel RGB PIL Image."""
    pixels, _ = parse_dicom_file(data)
    if pixels.ndim == 2:
        img_gray = Image.fromarray(pixels, mode="L")
        return img_gray.convert("RGB")
    elif pixels.ndim == 3 and pixels.shape[2] == 3:
        return Image.fromarray(pixels, mode="RGB")
    else:
        raise ValueError(f"Unexpected pixel array shape: {pixels.shape}")


def sanitize_dicom_metadata(ds: Dataset) -> Dataset:
    """Scrub direct identifiers from DICOM dataset in memory."""
    for tag in TAGS_TO_ANONYMIZE:
        if tag in ds:
            ds[tag].value = "ANONYMIZED"
    return ds

