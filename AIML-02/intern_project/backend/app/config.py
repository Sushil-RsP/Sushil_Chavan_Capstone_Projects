"""Application configuration loaded from environment variables."""
import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        protected_namespaces=(),
    )

    # App
    app_name: str = "MedImaging AI Demo"
    app_version: str = "0.1.0"
    debug: bool = False
    environment: str = "development"

    # Device
    device: str = Field(default="cpu", description="pytorch device: cpu or cuda")

    # Paths
    model_dir: str = Field(default="models/", description="Directory for model checkpoints")
    upload_dir: str = Field(default="uploads/", description="Temp upload directory")
    db_url: str = Field(default="sqlite+aiosqlite:///./data/app.db", description="Database URL")

    # Orthanc
    orthanc_url: str = Field(default="http://localhost:8042", description="Orthanc REST API base URL")
    orthanc_user: str = Field(default="orthanc", description="Orthanc username")
    orthanc_password: str = Field(default="orthanc", description="Orthanc password")
    orthanc_mock_mode: bool = Field(default=True, description="Use mock Orthanc when server unavailable")

    # Classification
    classification_checkpoint: str = Field(default="", description="Path to DenseNet121 checkpoint (.pth)")
    classification_labels: list[str] = Field(
        default=[
            "Atelectasis","Cardiomegaly","Consolidation","Edema","Effusion",
            "Emphysema","Fibrosis","Hernia","Infiltration","Mass",
            "No Finding","Nodule","Pleural_Thickening","Pneumonia","Pneumothorax"
        ],
        description="NIH ChestX-ray14 label list"
    )

    # Segmentation
    segmentation_checkpoint: str = Field(default="", description="Path to MONAI U-Net checkpoint")

    # Security
    max_upload_bytes: int = Field(default=50 * 1024 * 1024, description="50 MB upload limit")
    allowed_image_types: list[str] = Field(default=["image/jpeg", "image/png", "image/dicom-rle"])

    # Reviews
    reviewer_id: str = Field(default="demo-reviewer", description="Configured reviewer identity")

settings = Settings()
