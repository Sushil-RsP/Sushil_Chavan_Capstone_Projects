"""Tests for health and model registry endpoints."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert "version" in data
        assert "education only" in data["disclaimer"].lower()


@pytest.mark.asyncio
async def test_models_registry_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/models")
        assert res.status_code == 200
        models = res.json()
        assert len(models) >= 1
        densenet = models[0]
        assert "DenseNet121" in densenet["architecture"]
        assert len(densenet["labels"]) == 15
        assert densenet["mode"] in ("demo", "inference")

