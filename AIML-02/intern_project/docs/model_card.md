# Model Card: Chest X-Ray Multi-Label Classifier (DenseNet121)

> **For education only — not for clinical use.**

## Model Details
- **Architecture:** DenseNet-121 (Densely Connected Convolutional Networks).
- **Intended Task:** Multi-label thoracic pathology classification from single-view frontal chest radiographs.
- **Input Dimensions:** $3 \times 224 \times 224$ float32 tensor normalized with ImageNet statistics.
- **Output:** 15 continuous probability scores in range $[0.0, 1.0]$ via sigmoid activation.
- **Labels (15):** Atelectasis, Cardiomegaly, Consolidation, Edema, Effusion, Emphysema, Fibrosis, Hernia, Infiltration, Mass, No Finding, Nodule, Pleural Thickening, Pneumonia, Pneumothorax.
- **Training Loss:** Multi-label Binary Cross-Entropy with Logits (`torch.nn.BCEWithLogitsLoss`).
- **Optimization Strategy:** Adam optimizer with Cosine Annealing learning rate schedule.

## Intended Use
- **Primary Use:** Educational demonstrations, academic computer vision teaching, interpretability research.
- **Out of Scope & Contraindications:** Primary screening, clinical diagnosis, treatment triage, or patient self-diagnosis.

## Interpretability
- **Grad-CAM Layer:** `features.denseblock4` (final dense feature extraction block).
- **Attribution Interpretation:** Visual representation of model sensitivity. Heatmaps must never be treated as segmented pathology boundaries or anatomical truth.

## Known Biases and Limitations
1. **Weak NLP Supervision:** Training labels mined from text reports contain non-negligible label noise.
2. **Class Imbalance:** Pathologies such as Hernia and Emphysema have very low base prevalence.
3. **Institutional Distribution Shift:** Features learned on one hospital site frequently fail on another due to differing radiologic equipment, contrast settings, and projection angles.

