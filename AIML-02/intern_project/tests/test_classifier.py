"""Tests for classification inference endpoint and model wrapper."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.ml.classifier import get_classifier


def test_classifier_initialization():
    clf = get_classifier()
    assert clf is not None
    assert len(clf.labels) == 15
    assert clf.mode in ("demo", "inference")


@pytest.mark.asyncio
async def test_classify_endpoint_success(synthetic_jpeg_bytes):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        files = {"file": ("chest_scan.jpg", synthetic_jpeg_bytes, "image/jpeg")}
        res = await ac.post("/api/v1/classify", files=files)
        assert res.status_code == 200
        data = res.json()
        assert "request_id" in data
        assert "predictions" in data
        assert len(data["predictions"]) == 15
        assert data["top_score"] >= 0.0
        assert data["top_score"] <= 1.0
        assert data["inference_time_ms"] > 0
        assert "For education only" in data["disclaimer"]


@pytest.mark.asyncio
async def test_classify_endpoint_empty_file():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        files = {"file": ("empty.jpg", b"", "image/jpeg")}
        res = await ac.post("/api/v1/classify", files=files)
        assert res.status_code == 422

