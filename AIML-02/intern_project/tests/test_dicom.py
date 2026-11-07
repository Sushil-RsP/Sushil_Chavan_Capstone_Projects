"""Tests for DICOM processing and normalization."""
import numpy as np
import pytest
from dicom.parser import normalize_dicom_pixels


def test_normalize_dicom_pixels_range():
    raw_ct_pixels = np.array([[-1000.0, 0.0], [500.0, 1000.0]], dtype=np.float32)
    normalized = normalize_dicom_pixels(raw_ct_pixels)
    assert normalized.dtype == np.uint8
    assert normalized.min() == 0
    assert normalized.max() == 255


def test_normalize_flat_pixels():
    flat_pixels = np.full((10, 10), 100.0, dtype=np.float32)
    normalized = normalize_dicom_pixels(flat_pixels)
    assert normalized.shape == (10, 10)
    assert np.all(normalized == 0)

