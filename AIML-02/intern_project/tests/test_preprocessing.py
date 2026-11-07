"""Tests for image preprocessing and validation."""
import pytest
from PIL import Image
import torch
from app.ml.preprocess import (
    load_image_from_bytes,
    preprocess_for_classification,
    validate_image,
)


def test_load_valid_image(synthetic_jpeg_bytes):
    img = load_image_from_bytes(synthetic_jpeg_bytes)
    assert isinstance(img, Image.Image)
    assert img.mode == "RGB"


def test_preprocess_tensor_shape(synthetic_jpeg_bytes):
    img = load_image_from_bytes(synthetic_jpeg_bytes)
    tensor = preprocess_for_classification(img)
    assert isinstance(tensor, torch.Tensor)
    assert tensor.shape == (1, 3, 224, 224)
    assert tensor.dtype == torch.float32


def test_validate_image_success(synthetic_png_bytes):
    validate_image(synthetic_png_bytes, max_bytes=10 * 1024 * 1024)


def test_validate_image_empty():
    with pytest.raises(ValueError, match="Empty file"):
        validate_image(b"")


def test_validate_image_oversized(synthetic_png_bytes):
    with pytest.raises(ValueError, match="exceeds maximum size"):
        validate_image(synthetic_png_bytes, max_bytes=10)


def test_validate_image_corrupt():
    with pytest.raises(ValueError, match="Cannot open image|Cannot decode"):
        validate_image(b"NotAnImageHeaderData")

