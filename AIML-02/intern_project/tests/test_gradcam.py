"""Tests for Grad-CAM generation endpoint."""
import base64
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_gradcam_endpoint_success(synthetic_jpeg_bytes):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        files = {"file": ("scan.jpg", synthetic_jpeg_bytes, "image/jpeg")}
        data_payload = {"target_label": "Pneumonia"}
        res = await ac.post("/api/v1/gradcam", files=files, data=data_payload)
        assert res.status_code == 200
        data = res.json()
        assert "heatmap_base64" in data
        assert "overlay_base64" in data
        assert data["target_label"] == "Pneumonia"
        assert len(data["heatmap_base64"]) > 50

        # Validate that base64 payload decodes into bytes
        decoded = base64.b64decode(data["heatmap_base64"])
        assert len(decoded) > 0
        assert "NOT proof of medical reasoning" in data["explanation"]

