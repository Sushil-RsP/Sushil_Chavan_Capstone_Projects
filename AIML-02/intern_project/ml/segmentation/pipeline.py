#!/usr/bin/env python3
"""
MONAI 3D U-Net segmentation pipeline for CT/MRI volumes.

Task: Medical Segmentation Decathlon — Task06 (Lung CT)
Labels: 0=background, 1=lung_tumour
Modality: CT

STATUS: Training PENDING — checkpoint does not exist.
DO NOT pass 2D chest X-ray images to this pipeline.

Requirements:
    pip install monai>=1.3.0 nibabel>=5.0.0
    GPU with >=8 GB VRAM strongly recommended.
"""
from __future__ import annotations
import argparse
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

try:
    import monai
    from monai.networks.nets import UNet
    from monai.networks.layers import Norm
    from monai.losses import DiceCELoss
    from monai.metrics import DiceMetric
    from monai.transforms import (
        Compose, LoadImaged, EnsureChannelFirstd, Orientationd,
        Spacingd, ScaleIntensityRanged, CropForegroundd,
        RandCropByPosNegLabeld, RandFlipd, ToTensord,
        EnsureTyped, NormalizeIntensityd,
    )
    from monai.data import Dataset, DataLoader, decollate_batch
    from monai.inferers import sliding_window_inference
    MONAI_AVAILABLE = True
    logger.info("MONAI %s is available", monai.__version__)
except ImportError:
    MONAI_AVAILABLE = False
    logger.warning("MONAI not installed. Run: pip install monai>=1.3.0")


def build_unet() -> "monai.networks.nets.UNet":
    if not MONAI_AVAILABLE:
        raise ImportError("MONAI is required for the segmentation pipeline.")
    return UNet(
        spatial_dims=3,
        in_channels=1,
        out_channels=2,
        channels=(16, 32, 64, 128, 256),
        strides=(2, 2, 2, 2),
        num_res_units=2,
        norm=Norm.BATCH,
    )


def get_transforms(phase: str):
    """Return MONAI transforms for training or inference."""
    if not MONAI_AVAILABLE:
        raise ImportError("MONAI required")
    common = [
        LoadImaged(keys=["image", "label"]),
        EnsureChannelFirstd(keys=["image", "label"]),
        Orientationd(keys=["image", "label"], axcodes="RAS"),
        Spacingd(keys=["image", "label"], pixdim=(1.5, 1.5, 2.0), mode=("bilinear", "nearest")),
        ScaleIntensityRanged(keys=["image"], a_min=-1000, a_max=400, b_min=0.0, b_max=1.0, clip=True),
        CropForegroundd(keys=["image", "label"], source_key="image"),
        EnsureTyped(keys=["image", "label"]),
    ]
    if phase == "train":
        return Compose(common + [
            RandCropByPosNegLabeld(
                keys=["image", "label"], label_key="label",
                spatial_size=(96, 96, 96), pos=1, neg=1, num_samples=4
            ),
            RandFlipd(keys=["image", "label"], prob=0.5, spatial_axis=0),
        ])
    return Compose(common)


def train(data_dir: Path, output_dir: Path, epochs: int = 300, device_str: str = "auto") -> None:
    """Full training loop for the 3D U-Net."""
    if not MONAI_AVAILABLE:
        raise ImportError("MONAI required for training.")
    import torch
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu") if device_str == "auto" else torch.device(device_str)
    if device.type == "cpu":
        logger.warning("Training on CPU — this will be extremely slow. A GPU is strongly recommended.")

    # Build file lists
    image_dir = data_dir / "imagesTr"
    label_dir = data_dir / "labelsTr"
    image_files = sorted(image_dir.glob("*.nii.gz"))
    label_files = [label_dir / f.name for f in image_files]
    data_dicts = [{"image": str(i), "label": str(l)} for i, l in zip(image_files, label_files)]

    n = len(data_dicts)
    n_train = int(n * 0.8)
    train_data = data_dicts[:n_train]
    val_data   = data_dicts[n_train:]
    logger.info("%d training, %d validation volumes", len(train_data), len(val_data))

    train_tf = get_transforms("train")
    val_tf   = get_transforms("val")
    train_ds = Dataset(data=train_data, transform=train_tf)
    val_ds   = Dataset(data=val_data,   transform=val_tf)
    train_loader = DataLoader(train_ds, batch_size=2, shuffle=True,  num_workers=4, pin_memory=True)
    val_loader   = DataLoader(val_ds,   batch_size=1, shuffle=False, num_workers=4)

    model = build_unet().to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-4)
    loss_fn = DiceCELoss(to_onehot_y=True, softmax=True)
    dice_metric = DiceMetric(include_background=False, reduction="mean")

    output_dir.mkdir(parents=True, exist_ok=True)
    best_dice = 0.0

    for epoch in range(1, epochs + 1):
        model.train()
        epoch_loss = 0.0
        for batch in train_loader:
            imgs = batch["image"].to(device)
            lbls = batch["label"].to(device)
            optimizer.zero_grad()
            logits = model(imgs)
            loss = loss_fn(logits, lbls)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()

        if epoch % 10 == 0 or epoch == 1:
            model.eval()
            with torch.no_grad():
                for batch in val_loader:
                    imgs = batch["image"].to(device)
                    lbls = batch["label"].to(device)
                    preds = sliding_window_inference(imgs, (96, 96, 96), 4, model)
                    preds_list = decollate_batch(preds)
                    lbls_list  = decollate_batch(lbls)
                    dice_metric(y_pred=preds_list, y=lbls_list)
            mean_dice = dice_metric.aggregate().item()
            dice_metric.reset()
            logger.info("Epoch %d | loss=%.4f | val_dice=%.4f", epoch, epoch_loss / len(train_loader), mean_dice)
            if mean_dice > best_dice:
                best_dice = mean_dice
                ckpt = output_dir / "best_checkpoint.pth"
                torch.save(model.state_dict(), ckpt)
                logger.info("Saved best segmentation checkpoint (dice=%.4f)", best_dice)


def main() -> None:
    parser = argparse.ArgumentParser(description="3D U-Net segmentation training")
    parser.add_argument("--data-dir", required=True, type=Path, help="Path to MSD Task06 Lung directory")
    parser.add_argument("--output-dir", default="models/segmentation", type=Path)
    parser.add_argument("--epochs", default=300, type=int)
    parser.add_argument("--device", default="auto")
    args = parser.parse_args()
    train(args.data_dir, args.output_dir, args.epochs, args.device)


if __name__ == "__main__":
    main()
