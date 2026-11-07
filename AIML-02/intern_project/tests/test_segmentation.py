"""Tests for 3D segmentation endpoint."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_segment_endpoint_rejects_2d_image(synthetic_jpeg_bytes):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        files = {"file": ("chest.jpg", synthetic_jpeg_bytes, "image/jpeg")}
        res = await ac.post("/api/v1/segment", files=files)
        # 2D image should be rejected with 422 because it's not a NIfTI (.nii/.nii.gz)
        assert res.status_code == 422
        assert "Only NIfTI" in res.json()["detail"]


@pytest.mark.asyncio
async def test_segment_endpoint_accepts_nifti():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        files = {"file": ("volume.nii.gz", b"fake_nifti_data_stream", "application/gzip")}
        res = await ac.post("/api/v1/segment", files=files)
        assert res.status_code == 200
        data = res.json()
        assert data["mode"] == "demo"
        assert "mask_slice_base64" in data
        assert data["num_slices"] > 0

