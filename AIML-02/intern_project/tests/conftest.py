"""Pytest fixtures and configuration."""
import io
import sys
from pathlib import Path
import pytest
import numpy as np
from PIL import Image

# Ensure backend directory is in python path
backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.main import app
from app.database import Base, engine, AsyncSessionLocal, init_db


@pytest.fixture(scope="session", autouse=True)
def set_test_env(monkeypatch_session=None):
    import os
    os.environ["DEBUG"] = "true"
    os.environ["ORTHANC_MOCK_MODE"] = "true"
    os.environ["DB_URL"] = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def db_session():
    """Async session bound to in-memory database."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
def synthetic_jpeg_bytes() -> bytes:
    """Generate a valid 224x224 grayscale-as-RGB synthetic chest X-ray JPEG in memory."""
    arr = np.zeros((224, 224, 3), dtype=np.uint8)
    # Add simulated lung fields (darker ellipsoids) and spine
    y, x = np.mgrid[0:224, 0:224]
    left_lung = ((x - 70)**2 / 30**2 + (y - 112)**2 / 60**2) < 1.0
    right_lung = ((x - 154)**2 / 30**2 + (y - 112)**2 / 60**2) < 1.0
    arr[left_lung] = [40, 40, 40]
    arr[right_lung] = [40, 40, 40]
    arr[~left_lung & ~right_lung] = [180, 180, 180]

    img = Image.fromarray(arr, mode="RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture
def synthetic_png_bytes() -> bytes:
    """Generate a valid synthetic PNG image."""
    arr = np.full((128, 128, 3), 120, dtype=np.uint8)
    img = Image.fromarray(arr, mode="RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

