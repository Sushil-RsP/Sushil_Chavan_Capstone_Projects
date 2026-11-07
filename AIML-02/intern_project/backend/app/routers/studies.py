"""Router for DICOM Studies and automated inference retrieval."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dicom_service import (
    list_studies,
    sync_new_studies_and_infer,
    get_study_inferences,
    get_study_inference_by_uid,
)
from app.schemas import StudySummary, StudyInferenceResponse, SyncStudiesResponse

router = APIRouter(prefix="/api/v1", tags=["dicom"])


@router.get("/studies", response_model=list[StudySummary])
async def get_studies():
    """List available DICOM studies from Orthanc or mock data."""
    return await list_studies()


@router.post("/studies/sync-and-infer", response_model=SyncStudiesResponse)
async def trigger_sync_and_infer(db: AsyncSession = Depends(get_db)):
    """Pull new studies from Orthanc DICOM server, execute AI inference, and store results."""
    count, uids = await sync_new_studies_and_infer(db)
    return SyncStudiesResponse(
        processed_count=count,
        study_uids=uids,
        message=f"Successfully processed and stored inference for {count} new study/studies."
    )


@router.get("/studies/inferences", response_model=list[StudyInferenceResponse])
async def list_inferred_studies(db: AsyncSession = Depends(get_db)):
    """List all AI inference results generated from Orthanc studies."""
    return await get_study_inferences(db)


@router.get("/studies/inferences/{study_uid}", response_model=StudyInferenceResponse)
async def get_single_inferred_study(study_uid: str, db: AsyncSession = Depends(get_db)):
    """Retrieve stored AI inference and Grad-CAM overlay for a specific study."""
    inf = await get_study_inference_by_uid(study_uid, db)
    if not inf:
        raise HTTPException(status_code=404, detail="Study inference record not found.")
    return inf
