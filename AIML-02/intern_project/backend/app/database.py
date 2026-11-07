"""Async SQLAlchemy database setup."""
import datetime
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, DateTime, Text, Boolean, Float
from app.config import settings

engine = create_async_engine(settings.db_url, echo=settings.debug)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

def utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)

class Base(DeclarativeBase):
    pass

class Review(Base):
    __tablename__ = "reviews"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    study_id: Mapped[str] = mapped_column(String(255), nullable=False)
    model_version: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False)  # approved | rejected | pending
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewer_id: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(255), nullable=True)
    reviewer_id: Mapped[str] = mapped_column(String(128), nullable=False)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

class StudyInference(Base):
    """Inference result generated from pulled Orthanc DICOM studies."""
    __tablename__ = "study_inferences"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    study_uid: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    patient_id: Mapped[str] = mapped_column(String(128), default="ANON")
    modality: Mapped[str] = mapped_column(String(32), default="CR")
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    top_label: Mapped[str] = mapped_column(String(64), nullable=False)
    top_score: Mapped[float] = mapped_column(Float, nullable=False)
    predictions_json: Mapped[str] = mapped_column(Text, nullable=False)
    heatmap_base64: Mapped[str | None] = mapped_column(Text, nullable=True)
    overlay_base64: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending_review")  # pending_review | approved | rejected
    model_version: Mapped[str] = mapped_column(String(64), default="densenet121-v0.1-demo")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
