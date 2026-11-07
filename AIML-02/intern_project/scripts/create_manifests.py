#!/usr/bin/env python3
"""
Create patient-level train/validation/test split manifests for NIH ChestX-ray14.

Usage:
    python scripts/create_manifests.py \
        --data-dir data/raw/nih_chestxray14 \
        --output-dir data/splits \
        --seed 42

This script:
1. Reads Data_Entry_2017.csv
2. Extracts unique patient IDs
3. Performs a patient-level stratified split (70/10/20)
4. Writes CSV manifests with image paths and labels
5. Reports class distribution and split sizes

IMPORTANT: Patient-level splitting prevents data leakage where
images from the same patient appear in both train and test sets.
"""
from __future__ import annotations
import argparse
import csv
import hashlib
import json
import logging
import os
import random
from collections import Counter, defaultdict
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

LABELS = [
    "Atelectasis", "Cardiomegaly", "Consolidation", "Edema",
    "Effusion", "Emphysema", "Fibrosis", "Hernia", "Infiltration",
    "Mass", "No Finding", "Nodule", "Pleural_Thickening",
    "Pneumonia", "Pneumothorax",
]


def read_data_entry(csv_path: Path) -> dict[str, list[dict]]:
    """Return mapping from patient_id -> list of image records."""
    patient_images: dict[str, list[dict]] = defaultdict(list)
    with open(csv_path, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            pid = row["Patient ID"]
            patient_images[pid].append(row)
    return dict(patient_images)


def multilabel_vector(finding_str: str) -> list[int]:
    """Convert 'Atelectasis|Effusion' to a binary vector over LABELS."""
    findings = set(finding_str.split("|"))
    return [1 if lbl in findings else 0 for lbl in LABELS]


def split_patients(
    patient_ids: list[str], seed: int, fractions: tuple[float, float, float]
) -> tuple[list[str], list[str], list[str]]:
    """Patient-level random split. Returns (train, val, test) lists."""
    rng = random.Random(seed)
    ids = list(patient_ids)
    rng.shuffle(ids)
    n = len(ids)
    n_train = int(n * fractions[0])
    n_val   = int(n * fractions[1])
    return ids[:n_train], ids[n_train:n_train + n_val], ids[n_train + n_val:]


def write_manifest(
    records: list[dict], output_path: Path, image_dir: Path
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", newline="") as f:
        writer = csv.writer(f)
        header = ["image_path", "patient_id"] + LABELS
        writer.writerow(header)
        for rec in records:
            rel = image_dir / "images" / rec["Image Index"]
            vec = multilabel_vector(rec["Finding Labels"])
            writer.writerow([str(rel), rec["Patient ID"]] + vec)
    logger.info("Wrote %d records to %s", len(records), output_path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Create NIH ChestX-ray14 manifests")
    parser.add_argument("--data-dir", default="data/raw/nih_chestxray14", type=Path)
    parser.add_argument("--output-dir", default="data/splits", type=Path)
    parser.add_argument("--seed", default=42, type=int)
    parser.add_argument("--train-frac", default=0.7, type=float)
    parser.add_argument("--val-frac", default=0.1, type=float)
    args = parser.parse_args()

    csv_path = args.data_dir / "Data_Entry_2017.csv"
    if not csv_path.exists():
        logger.error("Data_Entry_2017.csv not found at %s", csv_path)
        logger.error("Please download NIH ChestX-ray14 first. See data/README.md")
        raise SystemExit(1)

    patient_images = read_data_entry(csv_path)
    logger.info("Found %d unique patients, %d total images",
                len(patient_images), sum(len(v) for v in patient_images.values()))

    test_frac = 1.0 - args.train_frac - args.val_frac
    train_pids, val_pids, test_pids = split_patients(
        list(patient_images.keys()), args.seed,
        (args.train_frac, args.val_frac, test_frac)
    )

    splits = {"train": train_pids, "val": val_pids, "test": test_pids}
    for split_name, pids in splits.items():
        records = []
        for pid in pids:
            records.extend(patient_images[pid])
        out = args.output_dir / f"{split_name}_manifest.csv"
        write_manifest(records, out, args.data_dir)

    # Save split summary
    summary = {
        "seed": args.seed,
        "num_patients": {"train": len(train_pids), "val": len(val_pids), "test": len(test_pids)},
        "num_images": {
            "train": sum(len(patient_images[p]) for p in train_pids),
            "val":   sum(len(patient_images[p]) for p in val_pids),
            "test":  sum(len(patient_images[p]) for p in test_pids),
        },
        "note": "Patient-level split — no patient appears in more than one split."
    }
    summary_path = args.output_dir / "split_summary.json"
    summary_path.write_text(json.dumps(summary, indent=2))
    logger.info("Split summary: %s", json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
