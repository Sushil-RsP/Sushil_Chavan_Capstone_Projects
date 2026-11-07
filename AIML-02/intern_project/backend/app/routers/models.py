from fastapi import APIRouter
from app.ml.classifier import get_classifier
from app.schemas import ModelInfo

router = APIRouter(tags=["models"])

@router.get("/models", response_model=list[ModelInfo])
async def list_models():
    clf = get_classifier()
    return [
        ModelInfo(
            model_id="densenet121-chestxray14",
            architecture="DenseNet121",
            task="multi-label-classification",
            labels=clf.labels,
            checkpoint_loaded=clf.checkpoint_loaded,
            mode=clf.mode,
        )
    ]
