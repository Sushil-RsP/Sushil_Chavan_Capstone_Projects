"""Pydantic request/response schemas."""
from __future__ import annotations
import datetime
from typing import Any
from pydantic import BaseModel, Field, field_validator

class BaseSchema(BaseModel):
    model_config = {"protected_namespaces": ()}

class HealthResponse(BaseSchema):
    status: str = "ok"
    version: str
    environment: str
    disclaimer: str = "For education only — not for clinical use."

class ModelInfo(BaseSchema):
    model_id: str
    architecture: str
    task: str
    labels: list[str]
    checkpoint_loaded: bool
    mode: str
    disclaimer: str = "For education only — not for clinical use."

class LabelPrediction(BaseSchema):
    label: str
    score: float = Field(ge=0.0, le=1.0)

class ClassificationResponse(BaseSchema):
    request_id: str
    mode: str
    model_version: str
    predictions: list[LabelPrediction]
    top_label: str
    top_score: float
    inference_time_ms: float
    disclaimer: str = "For education only — not for clinical use."
    warning: str | None = None

class GradCAMResponse(BaseSchema):
    request_id: str
    mode: str
    model_version: str
    heatmap_base64: str
    overlay_base64: str
    target_label: str
    inference_time_ms: float
    disclaimer: str = "For education only — not for clinical use."
    explanation: str = (
        "Grad-CAM visualises regions of the input image that most influenced the "
        "model's prediction. It is NOT proof of medical reasoning and should not "
        "be used for diagnosis."
    )

class SegmentationResponse(BaseSchema):
    request_id: str
    mode: str
    model_version: str
    mask_slice_base64: str
    num_slices: int
    dice_score: float | None = None
    inference_time_ms: float
    disclaimer: str = "For education only — not for clinical use."

class StudySummary(BaseSchema):
    study_uid: str
    patient_id: str
    study_date: str | None
    modality: str | None
    description: str | None
    num_series: int
    source: str

class StudyInferenceResponse(BaseSchema):
    id: str
    study_uid: str
    patient_id: str
    modality: str
    description: str | None
    top_label: str
    top_score: float
    predictions_json: str
    heatmap_base64: str | None = None
    overlay_base64: str | None = None
    status: str
    model_version: str
    created_at: datetime.datetime

    model_config = {"from_attributes": True, "protected_namespaces": ()}

class SyncStudiesResponse(BaseSchema):
    processed_count: int
    study_uids: list[str]
    message: str

class ReviewCreate(BaseSchema):
    study_id: str
    model_version: str
    status: str
    note: str | None = None

    @field_validator("status")
    @classmethod
    def status_must_be_valid(cls, v: str) -> str:
        if v not in ("approved", "rejected"):
            raise ValueError("status must be 'approved' or 'rejected'")
        return v

class ReviewResponse(BaseSchema):
    id: str
    study_id: str
    model_version: str
    status: str
    note: str | None
    reviewer_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True, "protected_namespaces": ()}

class AuditLogEntry(BaseSchema):
    id: str
    event_type: str
    entity_id: str | None
    reviewer_id: str
    detail: str | None
    created_at: datetime.datetime

    model_config = {"from_attributes": True, "protected_namespaces": ()}
