# Dataset Card: NIH ChestX-ray14 & MSD Lung CT

> **For education only — not for clinical use.**

## 1. NIH ChestX-ray14 (Classification)

### Overview
- **Repository:** National Institutes of Health Clinical Center
- **Access Portal:** https://nihcc.app.box.com/v/ChestXray-NIHCC
- **Total Scans:** 112,120 frontal chest radiographs (PA and AP projections)
- **Unique Patients:** 30,805 unique individuals
- **License:** NIH Open Access / NIH Data Use Agreement

### Annotation Methodology
- Disease labels were extracted automatically from unformatted radiologist text reports using natural language processing (MetaMap / rule-based string parsing).
- **Label Uncertainty:** Reported text confidence <0.5 is treated as uncertain and excluded from loss calculation in accordance with documented policy.

### Ethical & Privacy Considerations
- Scans are de-identified according to HIPAA Safe Harbor guidelines before public distribution.
- Demographic skew: Captures patients examined within the NIH Clinical Center, predominantly adults in the United States.

---

## 2. Medical Segmentation Decathlon Task06: Lung (Segmentation)

### Overview
- **Modality:** 3D Volumetric Computed Tomography (CT)
- **Target Structure:** Lung tumor / lesions (Label 1) vs. anatomical background (Label 0)
- **License:** Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
- **Format:** Neuroimaging Informatics Technology Initiative (NIfTI) format (`.nii.gz`)
- **Spacing / Orientation:** Resampled to RAS orientation with 1.5mm x 1.5mm x 2.0mm voxel resolution.

