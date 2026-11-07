"""Review and audit endpoints."""
from __future__ import annotations
import datetime
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.database import get_db, Review, AuditLog, StudyInference, utc_now
from app.config import settings
from app.schemas import ReviewCreate, ReviewResponse, AuditLogEntry

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["reviews"])


@router.post("/reviews", response_model=ReviewResponse, status_code=201)
async def create_review(
    body: ReviewCreate, db: AsyncSession = Depends(get_db)
):
    if body.status in ("rejected",) and not body.note:
        raise HTTPException(422, "A note is required when rejecting a study.")
    now = utc_now()
    review = Review(
        id=str(uuid.uuid4()),
        study_id=body.study_id,
        model_version=body.model_version,
        status=body.status,
        note=body.note,
        reviewer_id=settings.reviewer_id,
        created_at=now,
        updated_at=now,
    )
    db.add(review)
    log = AuditLog(
        id=str(uuid.uuid4()),
        event_type="review_created",
        entity_id=review.id,
        reviewer_id=settings.reviewer_id,
        detail=f"status={body.status}",
        created_at=now,
    )
    db.add(log)
    await db.commit()
    await db.refresh(review)
    return review


@router.get("/reviews", response_model=list[ReviewResponse])
async def list_reviews(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Review).order_by(Review.created_at.desc()))
    return result.scalars().all()


@router.get("/audit", response_model=list[AuditLogEntry])
async def list_audit(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()))
    return result.scalars().all()


@router.post("/reset", status_code=200)
async def reset_database(db: AsyncSession = Depends(get_db)):
    """Clear all reviews, audit logs, and study inferences to start fresh."""
    await db.execute(delete(Review))
    await db.execute(delete(AuditLog))
    await db.execute(delete(StudyInference))
    await db.commit()
    return {"message": "All database records (reviews, audit logs, and inferences) cleared successfully."}
