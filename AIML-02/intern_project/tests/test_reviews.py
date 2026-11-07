"""Tests for Review adjudication and audit log persistence."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_review_creation_and_audit():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Create an approved review
        payload = {
            "study_id": "1.2.840.113619.TEST.001",
            "model_version": "densenet121-v0.1-demo",
            "status": "approved",
            "note": "Normal lung volumes; model prediction accepted."
        }
        res = await ac.post("/api/v1/reviews", json=payload)
        assert res.status_code == 201
        review = res.json()
        assert review["study_id"] == payload["study_id"]
        assert review["status"] == "approved"
        assert "reviewer_id" in review

        # 2. Check that it lists in /reviews
        list_res = await ac.get("/api/v1/reviews")
        assert list_res.status_code == 200
        reviews = list_res.json()
        assert any(r["id"] == review["id"] for r in reviews)

        # 3. Check audit entry creation
        audit_res = await ac.get("/api/v1/audit")
        assert audit_res.status_code == 200
        audits = audit_res.json()
        assert any(a["entity_id"] == review["id"] for a in audits)


@pytest.mark.asyncio
async def test_review_rejection_requires_note():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "study_id": "1.2.840.113619.TEST.002",
            "model_version": "densenet121-v0.1-demo",
            "status": "rejected",
            "note": ""  # empty note must be rejected
        }
        res = await ac.post("/api/v1/reviews", json=payload)
        assert res.status_code == 422

