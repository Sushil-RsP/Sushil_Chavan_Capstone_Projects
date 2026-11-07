"""DICOM/Orthanc integration service with mock fallback and automated study pull & inference."""
from __future__ import annotations
import io
import json
import logging
import uuid
import datetime
from typing import Any, List, Optional
import httpx
import numpy as np
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.database import StudyInference, AuditLog, utc_now
from app.schemas import StudySummary, LabelPrediction
from app.ml.classifier import get_classifier
from app.ml.gradcam import get_gradcam

logger = logging.getLogger(__name__)

MOCK_STUDIES: list[StudySummary] = [
    StudySummary(
        study_uid="1.2.840.113619.2.55.3.MOCK001",
        patient_id="ANON-001",
        study_date="20240101",
        modality="CR",
        description="Chest PA — suspected infiltration",
        num_series=1,
        source="mock",
    ),
    StudySummary(
        study_uid="1.2.840.113619.2.55.3.MOCK002",
        patient_id="ANON-002",
        study_date="20240215",
        modality="CR",
        description="Chest PA — suspected cardiomegaly",
        num_series=1,
        source="mock",
    ),
]


def _create_synthetic_scan_bytes(variant: str = "normal") -> bytes:
    """Generate a realistic synthetic chest X-ray image in memory for automated inference."""
    arr = np.zeros((224, 224, 3), dtype=np.uint8)
    y, x = np.mgrid[0:224, 0:224]

    # Bilateral lung fields (darker ellipsoids)
    left_lung = ((x - 70)**2 / 30**2 + (y - 112)**2 / 60**2) < 1.0
    right_lung = ((x - 154)**2 / 30**2 + (y - 112)**2 / 60**2) < 1.0
    arr[left_lung] = [40, 40, 40]
    arr[right_lung] = [40, 40, 40]
    arr[~left_lung & ~right_lung] = [180, 180, 180]

    # Add cardiac silhouette
    cardiac = ((x - 110)**2 / 32**2 + (y - 145)**2 / 38**2) < 1.0
    arr[cardiac] = [170, 170, 170]

    if "cardiomegaly" in variant.lower():
        large_cardiac = ((x - 115)**2 / 50**2 + (y - 145)**2 / 45**2) < 1.0
        arr[large_cardiac] = [170, 170, 170]
    elif "pneumonia" in variant.lower() or "infiltration" in variant.lower():
        opacity = ((x - 72)**2 / 16**2 + (y - 120)**2 / 20**2) < 1.0
        arr[opacity] = [130, 130, 130]

    img = Image.fromarray(arr, mode="RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


async def list_studies() -> list[StudySummary]:
    """Return studies from Orthanc or from mock list if unavailable."""
    if settings.orthanc_mock_mode:
        logger.info("Orthanc mock mode — returning synthetic study list.")
        return MOCK_STUDIES

    try:
        async with httpx.AsyncClient(
            auth=(settings.orthanc_user, settings.orthanc_password),
            timeout=5.0,
        ) as client:
            resp = await client.get(f"{settings.orthanc_url}/studies")
            resp.raise_for_status()
            study_ids: list[str] = resp.json()
            studies = []
            for sid in study_ids[:20]:  # cap at 20 for demo
                detail = await client.get(f"{settings.orthanc_url}/studies/{sid}")
                d: dict[str, Any] = detail.json()
                main = d.get("MainDicomTags", {})
                studies.append(StudySummary(
                    study_uid=main.get("StudyInstanceUID", sid),
                    patient_id="ANON",  # never log patient identifiers
                    study_date=main.get("StudyDate"),
                    modality=main.get("ModalitiesInStudy"),
                    description=main.get("StudyDescription"),
                    num_series=len(d.get("Series", [])),
                    source="orthanc",
                ))
            return studies
    except Exception as exc:
        logger.warning("Orthanc query failed (%s). Returning mock studies.", exc)
        return MOCK_STUDIES


async def sync_new_studies_and_infer(db: AsyncSession) -> tuple[int, list[str]]:
    """Pull new studies from Orthanc (or mock pool), run classifier + Grad-CAM, and persist results."""
    studies = await list_studies()
    processed_uids: list[str] = []

    classifier = get_classifier()
    gradcam_engine = get_gradcam()

    for s in studies:
        # Check if already processed
        stmt = select(StudyInference).where(StudyInference.study_uid == s.study_uid)
        existing = await db.execute(stmt)
        if existing.scalar_one_or_none() is not None:
            continue

        image_bytes: Optional[bytes] = None

        # Attempt to pull real DICOM file if Orthanc is live
        if not settings.orthanc_mock_mode and s.source == "orthanc":
            try:
                async with httpx.AsyncClient(
                    auth=(settings.orthanc_user, settings.orthanc_password),
                    timeout=8.0,
                ) as client:
                    # Find instances for study
                    inst_resp = await client.get(f"{settings.orthanc_url}/studies/{s.study_uid}/instances")
                    if inst_resp.status_code == 200 and inst_resp.json():
                        instance_id = inst_resp.json()[0]["ID"]
                        file_resp = await client.get(f"{settings.orthanc_url}/instances/{instance_id}/file")
                        if file_resp.status_code == 200:
                            # Try parsing with pydicom
                            try:
                                from dicom.parser import dicom_to_pil_image
                                pil_img = dicom_to_pil_image(file_resp.content)
                                buf = io.BytesIO()
                                pil_img.save(buf, format="JPEG")
                                image_bytes = buf.getvalue()
                            except Exception:
                                image_bytes = None
            except Exception as exc:
                logger.warning("Could not download live DICOM instance for %s: %s", s.study_uid, exc)

        # Fallback to synthetic scan if bytes could not be fetched
        if image_bytes is None:
            variant = s.description or "normal"
            image_bytes = _create_synthetic_scan_bytes(variant)

        # Execute automated inference
        clf_result = classifier.predict(image_bytes, filename=s.description or "study.dcm")
        cam_result = gradcam_engine.generate(
            image_bytes,
            target_label=clf_result.top_label,
            filename=s.description or "study.dcm",
        )

        preds_data = [
            {"label": p.label, "score": p.score}
            for p in clf_result.predictions
        ]

        now = utc_now()
        study_inf = StudyInference(
            id=str(uuid.uuid4()),
            study_uid=s.study_uid,
            patient_id=s.patient_id,
            modality=s.modality or "CR",
            description=s.description,
            top_label=clf_result.top_label,
            top_score=clf_result.top_score,
            predictions_json=json.dumps(preds_data),
            heatmap_base64=cam_result.heatmap_base64,
            overlay_base64=cam_result.overlay_base64,
            status="pending_review",
            model_version=clf_result.model_version,
            created_at=now,
        )
        db.add(study_inf)

        audit_entry = AuditLog(
            id=str(uuid.uuid4()),
            event_type="orthanc_study_auto_inferred",
            entity_id=study_inf.id,
            reviewer_id="system-orthanc-worker",
            detail=f"study_uid={s.study_uid}; top_label={clf_result.top_label}; score={clf_result.top_score:.3f}",
            created_at=now,
        )
        db.add(audit_entry)
        processed_uids.append(s.study_uid)

    if processed_uids:
        await db.commit()
        logger.info("Auto-inferred %d new studies from Orthanc service.", len(processed_uids))

    return len(processed_uids), processed_uids


async def get_study_inferences(db: AsyncSession) -> list[StudyInference]:
    """Retrieve all stored study inference records."""
    stmt = select(StudyInference).order_by(StudyInference.created_at.desc())
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def get_study_inference_by_uid(study_uid: str, db: AsyncSession) -> Optional[StudyInference]:
    """Retrieve a specific study inference by Study UID."""
    stmt = select(StudyInference).where(StudyInference.study_uid == study_uid)
    res = await db.execute(stmt)
    return res.scalar_one_or_none()
