# Sample Test Scans for Demonstration

This directory contains pre-generated synthetic frontal chest radiograph scans designed for immediate testing of the **AI-Assisted Medical Imaging and Diagnosis System**.

### Available Sample Scans:
1. `sample_normal_chest_pa.png`: Aerated bilateral lung fields with sharp costophrenic angles and normal cardiothoracic ratio (~0.42). Expected top finding: **No Finding**.
2. `sample_pneumonia_consolidation.png`: Focal alveolar opacity in the right lower lung zone. Expected top findings: **Pneumonia / Consolidation / Infiltration**.
3. `sample_cardiomegaly_enlarged_heart.png`: Grossly enlarged cardiac silhouette (cardiothoracic ratio > 0.55). Expected top finding: **Cardiomegaly**.
4. `sample_pleural_effusion.png`: Blunted right costophrenic angle with fluid meniscus. Expected top finding: **Effusion**.

### How to Test:
1. Open the web interface at `http://localhost:5173/scan` (Scan & Analyze).
2. Drag and drop any of the sample files above into the dropzone.
3. Click **"Run Classification"** to view multi-label pathology predictions and confidence scores.
4. Select the target class and click **"Generate Map"** to inspect the Grad-CAM activation heatmap overlay.
5. In the **Radiologist Adjudication & Audit Log** card, select **Approve** or **Reject** (enter clinical rationale note), and click **Record Radiologist Decision in Audit Log**.
6. Verify the immutable audit trail under `http://localhost:5173/audit-log`.
