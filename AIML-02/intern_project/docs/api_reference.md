# REST API Reference & Usage Guide

> **For education only — not for clinical use.**

Base URL: `http://localhost:8000`

---

## 1. System Health & Models

### `GET /health`
Returns backend health status, deployed version, and environment.

**Sample Request:**
```bash
curl -X GET http://localhost:8000/health
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "version": "0.1.0",
  "environment": "development",
  "disclaimer": "For education only — not for clinical use."
}
```

### `GET /models`
Lists all registered ML models, architectures, class labels, and checkpoint status.

**Sample Request:**
```bash
curl -X GET http://localhost:8000/models
```

---

## 2. Radiographic Inference

### `POST /api/v1/classify`
Uploads a single-view chest radiograph (JPEG or PNG) for 15-class thoracic multi-label classification.

**Sample Request:**
```bash
curl -X POST http://localhost:8000/api/v1/classify \
  -F "file=@sample_chest_xray.jpg"
```

**Response (200 OK):**
```json
{
  "request_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "mode": "demo",
  "model_version": "densenet121-v0.1-demo",
  "predictions": [
    { "label": "No Finding", "score": 0.65 },
    { "label": "Atelectasis", "score": 0.08 }
  ],
  "top_label": "No Finding",
  "top_score": 0.65,
  "inference_time_ms": 42.1,
  "disclaimer": "For education only — not for clinical use."
}
```

### `POST /api/v1/gradcam`
Generates Grad-CAM activation heatmap base64 and blended overlay for a target pathology.

**Sample Request:**
```bash
curl -X POST http://localhost:8000/api/v1/gradcam \
  -F "file=@sample_chest_xray.jpg" \
  -F "target_label=Pneumonia"
```

---

## 3. 3D Volumetric Segmentation

### `POST /api/v1/segment`
Uploads a NIfTI CT/MRI volume (`.nii` or `.nii.gz`) for MONAI 3D U-Net axial slice segmentation.

**Sample Request:**
```bash
curl -X POST http://localhost:8000/api/v1/segment \
  -F "file=@lung_ct_scan.nii.gz"
```

---

## 4. Radiologist Adjudication & Audit

### `POST /api/v1/reviews`
Submits an adjudication review for a study.

**Sample Request:**
```bash
curl -X POST http://localhost:8000/api/v1/reviews \
  -H "Content-Type: application/json" \
  -d '{
    "study_id": "1.2.840.113619.TEST.001",
    "model_version": "densenet121-v0.1-demo",
    "status": "approved",
    "note": "Normal anatomical findings"
  }'
```

### `GET /api/v1/audit`
Retrieves immutable event log for security auditing.

