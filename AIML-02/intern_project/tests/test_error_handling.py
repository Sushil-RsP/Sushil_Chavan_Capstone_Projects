"""Tests for validation and error boundary behavior."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_corrupted_image_handling():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        corrupted_bytes = b"\x00\x01\x02\x03\x04\x05CorruptedData"
        files = {"file": ("corrupt.jpg", corrupted_bytes, "image/jpeg")}
        res = await ac.post("/api/v1/classify", files=files)
        assert res.status_code == 422


@pytest.mark.asyncio
async def test_oversized_image_handling():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Generate 51 MB dummy payload to exceed 50 MB limit
        large_bytes = b"0" * (51 * 1024 * 1024)
        files = {"file": ("huge.jpg", large_bytes, "image/jpeg")}
        res = await ac.post("/api/v1/classify", files=files)
        assert res.status_code == 422
        assert "exceeds maximum size" in res.json()["detail"]


@pytest.mark.asyncio
async def test_path_traversal_filename_sanitized():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        files = {"file": ("../../../../etc/passwd.jpg", b"dummy", "image/jpeg")}
        res = await ac.post("/api/v1/classify", files=files)
        # Should not cause path traversal or server 500 error; returns 422 unprocessable image
        assert res.status_code == 422

