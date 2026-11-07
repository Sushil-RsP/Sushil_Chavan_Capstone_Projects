#!/usr/bin/env python3
"""
Evaluation script for the trained DenseNet121 model.

Computes per-label and aggregate metrics on the held-out test set.
Results are saved as machine-readable JSON and human-readable text.

DISCLAIMER: Test performance on NIH ChestX-ray14 does NOT establish
clinical validity or generalization to other hospitals or populations.
Results reflect performance on weakly-labelled NLP-derived annotations.
"""
from __future__ import annotations
import argparse
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch
from sklearn.metrics import (
    average_precision_score, classification_report,
    confusion_matrix, roc_auc_score, f1_score, precision_score, recall_score,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

LABELS = [
    "Atelectasis","Cardiomegaly","Consolidation","Edema","Effusion",
    "Emphysema","Fibrosis","Hernia","Infiltration","Mass",
    "No Finding","Nodule","Pleural_Thickening","Pneumonia","Pneumothorax",
]


def evaluate_model(
    model, loader, device: torch.device, threshold: float = 0.5
) -> dict:
    from ml.classification.train import evaluate
    _, scores, labels_true = evaluate(model, loader, torch.nn.BCEWithLogitsLoss(), device)
    preds = (scores >= threshold).astype(int)

    per_label: dict[str, dict] = {}
    aucs = []
    for i, lbl in enumerate(LABELS):
        y_true = labels_true[:, i]
        y_score = scores[:, i]
        y_pred = preds[:, i]
        pos_count = int(y_true.sum())
        if pos_count == 0:
            logger.warning("Label '%s' has 0 positive samples in test set — AUC undefined", lbl)
            auc = None
        else:
            auc = float(roc_auc_score(y_true, y_score))
            aucs.append(auc)
        per_label[lbl] = {
            "roc_auc": auc,
            "precision": float(precision_score(y_true, y_pred, zero_division=0)),
            "recall": float(recall_score(y_true, y_pred, zero_division=0)),
            "f1": float(f1_score(y_true, y_pred, zero_division=0)),
            "positive_count": pos_count,
            "total_count": len(y_true),
        }

    mean_auc = float(np.mean(aucs)) if aucs else None
    macro_f1 = float(f1_score(labels_true, preds, average="macro", zero_division=0))

    return {
        "mean_roc_auc": mean_auc,
        "macro_f1": macro_f1,
        "threshold": threshold,
        "per_label": per_label,
        "disclaimer": (
            "Test metrics are computed on NIH ChestX-ray14 test split. "
            "These results do NOT establish clinical validity or guarantee "
            "performance on data from other sources."
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", required=True, type=Path)
    parser.add_argument("--manifest-dir", default="data/splits", type=Path)
    parser.add_argument("--output-dir", default="models/classification/eval", type=Path)
    parser.add_argument("--device", default="auto")
    parser.add_argument("--threshold", default=0.5, type=float)
    args = parser.parse_args()

    if args.device == "auto":
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    else:
        device = torch.device(args.device)

    # Load model
    from torchvision import models as tv_models
    import torch.nn as nn
    ckpt = torch.load(args.checkpoint, map_location=device, weights_only=True)
    model = tv_models.densenet121(weights=None)
    in_features = model.classifier.in_features
    model.classifier = nn.Linear(in_features, len(LABELS))
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval().to(device)
    logger.info("Loaded checkpoint: epoch=%s, val_loss=%.4f", ckpt.get("epoch"), ckpt.get("val_loss", 0))

    from torchvision import transforms
    from torch.utils.data import DataLoader
    from ml.classification.train import ChestXRayDataset
    tf = transforms.Compose([
        transforms.Resize(256), transforms.CenterCrop(224),
        transforms.ToTensor(), transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225]),
    ])
    test_ds = ChestXRayDataset(args.manifest_dir / "test_manifest.csv", transform=tf)
    test_loader = DataLoader(test_ds, batch_size=64, shuffle=False, num_workers=4)

    results = evaluate_model(model, test_loader, device, args.threshold)
    results["evaluation_date"] = datetime.now(timezone.utc).isoformat()
    results["checkpoint"] = str(args.checkpoint)
    results["hardware"] = str(device)
    results["num_test_samples"] = len(test_ds)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    json_out = args.output_dir / "evaluation_results.json"
    json_out.write_text(json.dumps(results, indent=2))
    logger.info("Results saved to %s", json_out)
    logger.info("Mean AUC: %.4f | Macro F1: %.4f", results.get("mean_roc_auc") or 0, results["macro_f1"])


if __name__ == "__main__":
    main()
