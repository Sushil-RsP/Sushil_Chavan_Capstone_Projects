# Live Demonstration Script: AI Medical Imaging Prototype
**Running Time:** ~5–7 Minutes  
**Target Audience:** Students, Instructors, Evaluators  
**Disclaimer:** *For education only — not for clinical use.*

---

## 1. Pre-Demo Checklist
1. Ensure FastAPI backend is running:
   ```bash
   cd backend
   uvicorn app.main:app --reload --port 8000
   ```
2. Ensure Frontend dev server is running:
   ```bash
   cd frontend
   npm run dev
   ```
3. Open browser at `http://localhost:5173`.
4. Point out the top sticky warning banner: *"For education only — not for clinical use. Not approved for medical diagnosis."*

---

## 2. Walkthrough Steps

### Step 1: System Overview Page
- **Action:** Navigate to **Overview**.
- **Talking Points:**
  - Show the Backend Health status (Online, version 0.1.0).
  - Highlight the Model Registry: Note the clear label **Demo Mode** indicating no random weights are being disguised as real clinical predictions.
  - Review counters for approved and rejected case history.

### Step 2: Chest X-Ray Classification & Grad-CAM
- **Action:** Navigate to **New Scan** (or **AI Analysis**).
- **Demonstration:**
  - Drag and drop a sample chest radiograph (e.g., standard PA view JPEG/PNG).
  - Click **Run Classification**.
  - Review the prediction panel: Observe the top finding and the horizontal distribution across all 15 NIH pathology classes.
  - Note the explicit latency measurement (e.g., ~45ms) and the prominent warning that this is in Demo Mode.
  - Select a target pathology (e.g., "Pneumonia" or "Cardiomegaly") from the dropdown.
  - Click **Generate Map** to compute Grad-CAM visual attribution.
  - Adjust the **Overlay Opacity Slider** back and forth to show how the activation heatmap corresponds with anatomical regions in the original radiograph.
  - Explain to the audience: *"This heatmap reflects convolutional filter sensitivity, not validated radiological reasoning."*

### Step 3: 3D Volumetric Segmentation
- **Action:** Navigate to **Segmentation**.
- **Demonstration:**
  - Attempt to upload a 2D JPEG image -> Demonstrate that the UI and API reject 2D images with a clear message that only 3D volumetric NIfTI datasets are accepted.
  - Upload a test `.nii.gz` volume.
  - Click **Execute MONAI 3D Inference**.
  - Inspect the representative axial slice segmentation mask and slice telemetry.
  - Emphasize that segmentation training is pending and displayed in transparent demo mode.

### Step 4: DICOM PACS Ingestion
- **Action:** Navigate to **Studies**.
- **Demonstration:**
  - View the list of studies ingested via the Orthanc DICOM integration service.
  - Point out that direct patient identifiers are masked to "ANON" to demonstrate HIPAA compliance principles.

### Step 5: Radiologist Review Queue & Audit Ledger
- **Action:** Navigate to **Review Queue**.
- **Demonstration:**
  - Input a study UID (e.g., `1.2.840.113619.TEST.001`).
  - Demonstrate rejection validation: Try clicking "Reject" without providing a note -> Point out that rejection strictly demands an explanatory clinical note.
  - Enter a valid note: *"Suspected overcalling of consolidation in retrocardiac space"*, then commit the rejection.
  - Show that the decision is persisted immediately into SQLite.
  - Navigate to **Audit Log** to inspect the append-only ledger entry with timestamp, operator ID, and action metadata.

### Step 6: Model Metrics & Ethical Limitations
- **Action:** Navigate to **Model Metrics**.
- **Demonstration:**
  - Review the architecture specification (DenseNet121, 15 classes).
  - Emphasize the section on **Algorithmic Bias, Distribution Shift & Disclaimers**.

