# System Architecture

> For education only — not for clinical use.

## Component Overview

```mermaid
graph TD
    User[Radiologist / Student] --> FE[React Frontend :5173]
    FE -->|HTTP REST| API[FastAPI Backend :8000]
    API --> CLF[DenseNet121 Classifier]
    API --> GC[Grad-CAM Extractor]
    API --> SEG[MONAI 3D U-Net]
    API --> DS[DICOM Service]
    DS -->|HTTP| ORT[Orthanc :8042]
    DS -->|fallback| MOCK[Mock Studies]
    API --> DB[(SQLite Database)]
    CLF -->|weights_only=True| CKPT[(Classification Checkpoint)]
    SEG --> SCKPT[(Segmentation Checkpoint)]
    DB --> REV[Review Table]
    DB --> AUD[Audit Log Table]
```

## Data Flow: Classification

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as FastAPI
    participant PRE as Preprocessor
    participant CLF as Classifier
    participant GC as Grad-CAM

    U->>FE: Upload chest X-ray
    FE->>API: POST /api/v1/classify
    API->>PRE: validate_image()
    PRE->>CLF: preprocess + forward()
    CLF-->>API: ClassificationResponse
    API-->>FE: JSON (predictions, mode, inference_time)
    FE->>API: POST /api/v1/gradcam
    API->>GC: generate(image, target_label)
    GC-->>API: GradCAMResponse (heatmap_base64, overlay_base64)
    API-->>FE: JSON
    FE->>U: Display overlay + scores
```

## Data Flow: Review

```mermaid
sequenceDiagram
    participant R as Reviewer
    participant FE as Frontend
    participant API as FastAPI
    participant DB as SQLite

    R->>FE: Click Approve/Reject
    FE->>API: POST /api/v1/reviews
    API->>DB: INSERT Review + AuditLog
    DB-->>API: Review record
    API-->>FE: ReviewResponse (201)
    FE->>R: Updated review panel
```

## Security Boundaries

- File uploads: validated size (50 MB), type, and image decodability
- No path traversal: uploads handled as in-memory bytes, not stored paths
- Checkpoint loading: `weights_only=True` (PyTorch safe mode)
- Orthanc: authenticated with HTTP Basic; mock mode for development
- Patient data: patient IDs anonymised to "ANON" in DICOM queries; never logged
- Secrets: loaded from `.env`, never committed to git
