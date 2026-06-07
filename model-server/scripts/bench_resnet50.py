"""ResNet50-default branch benchmark — flat ResNet50 + YOLOv12n pipeline.

Tests the candidate flat ResNet50 (7-class, 224×224) against the same
HAM10000 validation set used for the MobileViT/EfficientNet-B4 benches, with
the same YOLOv12n detector, so results are directly comparable.

Usage (from model-server/ with .venv active):
    python -m scripts.bench_resnet50

Outputs (written to DOWNLOADS/resnet50_test_results/):
    metrics.txt    — accuracy, balanced-acc, precision, recall, F1, FPS, RAM
    xai_report.png — GradCAM visualisation for 10 random samples

Model files:
    weights/best_resnet50.pth                   (relative to model-server/)
    C:\\Users\\admin\\Downloads\\best2_repacked.pt   (YOLOv12n)

Validation data (same as MobileViT / EfficientNet-B4 benches):
    C:\\Users\\admin\\Downloads\\Validation Dataset\\images\\
    C:\\Users\\admin\\Downloads\\Validation Dataset\\validation_set_metadata.csv
"""

from __future__ import annotations

import csv
import os
import random
import sys
import time
from pathlib import Path
from typing import Optional

import cv2
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import psutil
import torch
import torch.nn as nn
from PIL import Image
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    confusion_matrix,
    precision_recall_fscore_support,
)
from tqdm import tqdm

# =========================================================
# CONFIGURATION
# =========================================================

_SCRIPT_DIR = Path(__file__).resolve().parent
MODEL_SERVER_DIR = _SCRIPT_DIR.parent          # model-server/
WEIGHTS_PATH = MODEL_SERVER_DIR / "weights" / "best_resnet50.pth"

DOWNLOADS = Path(r"C:\Users\admin\Downloads")
YOLO_PTH  = DOWNLOADS / "best2_repacked.pt"

VAL_DIR    = DOWNLOADS / "Validation Dataset"
IMG_DIR    = VAL_DIR / "images"
LABELS_CSV = VAL_DIR / "validation_set_metadata.csv"

OUT_DIR = DOWNLOADS / "resnet50_test_results"
OUT_DIR.mkdir(parents=True, exist_ok=True)
XAI_PATH     = OUT_DIR / "xai_report.png"
METRICS_PATH = OUT_DIR / "metrics.txt"

IMG_SIZE = 224   # ResNet50 native resolution (training used Resize(224, BILINEAR))

# Model label order — must match training label_mapping (sorted HAM10000 dx codes,
# uppercased): AK=0 BCC=1 BKL=2 DF=3 MEL=4 NV=5 VASC=6 (identical to EfficientNet-B4)
CLASS_NAMES = ["AK", "BCC", "BKL", "DF", "MEL", "NV", "VASC"]

# HAM10000 CSV dx codes → model label (CSV uses lowercase HAM codes)
HAM_TO_MODEL: dict[str, str] = {
    "akiec": "AK",
    "bcc":   "BCC",
    "bkl":   "BKL",
    "df":    "DF",
    "mel":   "MEL",
    "nv":    "NV",
    "vasc":  "VASC",
}

YOLO_CONF_THRESH = 0.25
YOLO_PAD         = 0.60   # 60 % padding — matches MobileViT / EffNet-B4 benches

IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32).reshape(3, 1, 1)
IMAGENET_STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32).reshape(3, 1, 1)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# =========================================================
# PREPROCESSING
# =========================================================

def preprocess(img_pil: Image.Image) -> torch.Tensor:
    """PIL → (1,3,224,224) float32 tensor. Matches preprocess.py pil_to_tensor
    (BILINEAR resize — torchvision transforms.Resize default, used at train time)."""
    rgb = img_pil.convert("RGB").resize((IMG_SIZE, IMG_SIZE), Image.BILINEAR)
    arr = np.array(rgb, dtype=np.float32) / 255.0   # HWC [0,1]
    arr = arr.transpose(2, 0, 1)                     # CHW
    arr = (arr - IMAGENET_MEAN) / IMAGENET_STD
    return torch.from_numpy(arr).unsqueeze(0).to(DEVICE)


# =========================================================
# MODEL LOADING
# =========================================================

def load_resnet50(path: Path) -> nn.Module:
    from torchvision.models import resnet50
    print(f"  Loading ResNet50: {path} ...")
    if not path.is_file():
        raise FileNotFoundError(f"Weights not found: {path}")
    model = resnet50(weights=None)
    model.fc = nn.Linear(model.fc.in_features, len(CLASS_NAMES))
    state = torch.load(str(path), map_location="cpu", weights_only=True)
    model.load_state_dict(state, strict=True)
    model.to(DEVICE).eval()
    print(f"    → ResNet50 loaded ({len(CLASS_NAMES)} classes)")
    return model


def load_yolo(path: Path):
    from ultralytics import YOLO
    print(f"  Loading YOLO: {path.name} ...")
    model = YOLO(str(path))
    print(f"    → YOLO loaded")
    return model


# =========================================================
# INFERENCE
# =========================================================

@torch.no_grad()
def classify(model: nn.Module, tensor: torch.Tensor) -> np.ndarray:
    """Forward pass → softmax probabilities (7,)."""
    logits = model(tensor)
    if isinstance(logits, (list, tuple)):
        logits = logits[0]
    probs = torch.softmax(logits, dim=-1)[0].cpu().numpy()
    return probs


def detect_and_crop(yolo_model, img_pil: Image.Image) -> Image.Image:
    """YOLO detection → padded crop of best box, or original if no hit."""
    results = yolo_model(img_pil, conf=YOLO_CONF_THRESH, verbose=False)
    boxes   = results[0].boxes

    if boxes is None or len(boxes) == 0:
        return img_pil

    confs = boxes.conf.cpu().numpy()
    best  = int(np.argmax(confs))
    xyxy  = boxes.xyxy[best].cpu().numpy()
    x1, y1, x2, y2 = xyxy

    w, h   = x2 - x1, y2 - y1
    pad_x  = w * YOLO_PAD
    pad_y  = h * YOLO_PAD
    orig_w, orig_h = img_pil.size

    cx1 = int(max(0, x1 - pad_x))
    cy1 = int(max(0, y1 - pad_y))
    cx2 = int(min(orig_w, x2 + pad_x))
    cy2 = int(min(orig_h, y2 + pad_y))

    if cx2 > cx1 and cy2 > cy1:
        return img_pil.crop((cx1, cy1, cx2, cy2))
    return img_pil


def run_pipeline(
    img_pil:   Image.Image,
    yolo_model,
    model:     nn.Module,
) -> tuple[int, np.ndarray, Image.Image]:
    """YOLO crop → ResNet50 classify. Returns (pred_idx, probs, crop)."""
    crop   = detect_and_crop(yolo_model, img_pil)
    tensor = preprocess(crop)
    probs  = classify(model, tensor)
    return int(np.argmax(probs)), probs, crop


# =========================================================
# GRAD-CAM ON layer4[-1]
# =========================================================

_feat_cache: dict = {}
_grad_cache: dict = {}


def _fwd_hook(module, input, output):
    _feat_cache["feat"] = output.detach()


def _bwd_hook(module, grad_in, grad_out):
    _grad_cache["grad"] = grad_out[0].detach()


def gradcam_overlay(
    model:     nn.Module,
    tensor:    torch.Tensor,
    pred_idx:  int,
    crop_bgr:  np.ndarray,
) -> np.ndarray:
    """Grad-CAM on model.layer4[-1] (2048-ch final bottleneck before avgpool)."""
    try:
        target_layer = model.layer4[-1]
        fwd_handle = target_layer.register_forward_hook(_fwd_hook)
        bwd_handle = target_layer.register_full_backward_hook(_bwd_hook)

        tensor_req = tensor.clone().requires_grad_(True)
        logits = model(tensor_req)
        if isinstance(logits, (list, tuple)):
            logits = logits[0]

        model.zero_grad()
        logits[0, pred_idx].backward()

        fwd_handle.remove()
        bwd_handle.remove()

        feat = _feat_cache.get("feat")   # (1, C, H, W)
        grad = _grad_cache.get("grad")   # (1, C, H, W)

        if feat is None or grad is None:
            raise RuntimeError("hooks did not fire")

        weights = grad.mean(dim=(2, 3), keepdim=True)   # GAP over spatial
        cam = (weights * feat).sum(dim=1).squeeze(0)    # (H, W)
        cam = torch.relu(cam).cpu().numpy()
        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
        cam = cv2.resize(cam, (crop_bgr.shape[1], crop_bgr.shape[0]))

        heatmap = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_VIRIDIS)
        overlay = cv2.addWeighted(crop_bgr, 0.45, heatmap, 0.55, 0)
        return cv2.cvtColor(overlay, cv2.COLOR_BGR2RGB)

    except Exception as e:
        print(f"  GradCAM error: {e}")
        return cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2RGB)


# =========================================================
# UTILITY
# =========================================================

def get_ram_mb() -> float:
    return psutil.Process(os.getpid()).memory_info().rss / (1024 * 1024)


def load_labels(csv_path: Path) -> dict[str, str]:
    """Returns {image_id → model_label} using HAM_TO_MODEL mapping."""
    labels: dict[str, str] = {}
    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            img_id = row["image_id"].strip().removesuffix(".jpg")
            dx     = row["dx"].strip().lower()
            mapped = HAM_TO_MODEL.get(dx)
            if mapped is not None:
                labels[img_id] = mapped
    return labels


# =========================================================
# XAI REPORT
# =========================================================

def render_xai_report(xai_data: list[dict], out_path: Path) -> None:
    rows = len(xai_data)
    fig  = plt.figure(figsize=(18, rows * 5), facecolor="white")
    gs   = fig.add_gridspec(rows, 4, wspace=0.65, hspace=1.25)
    fig.suptitle(
        "Explainable AI — ResNet50 Skin Lesion Pipeline (Grad-CAM)",
        fontsize=22, fontweight="bold", y=0.995,
    )

    for i, d in enumerate(xai_data):
        correct = d["actual"] == d["pred"]

        ax0 = fig.add_subplot(gs[i, 0])
        ax0.imshow(d["orig"]); ax0.axis("off")
        ax0.set_title(f"Input: {d['actual']}", fontsize=12, pad=18)

        ax1 = fig.add_subplot(gs[i, 1])
        ax1.imshow(d["crop"]); ax1.axis("off")
        ax1.set_title("YOLO Crop", fontsize=12, pad=18)

        ax2 = fig.add_subplot(gs[i, 2])
        ax2.imshow(d["heatmap"]); ax2.axis("off")
        ax2.set_title("Grad-CAM", fontsize=12,
                      color="darkred", fontweight="bold", pad=18)

        ax3 = fig.add_subplot(gs[i, 3])
        ax3.axis("off")
        ax3.text(0.05, 0.65, f"PREDICTED:\n{d['pred']}",
                 fontsize=15, fontweight="bold", transform=ax3.transAxes)
        color, symbol = ("#27ae60", "✓ CORRECT") if correct else ("#c0392b", "✗ INCORRECT")
        ax3.text(0.05, 0.35, symbol, fontsize=13, color="white", fontweight="bold",
                 bbox=dict(facecolor=color, edgecolor="none", boxstyle="round,pad=0.5"),
                 transform=ax3.transAxes)

    plt.savefig(str(out_path), dpi=180, bbox_inches="tight")
    plt.close(fig)
    print(f"  XAI report → {out_path}")


# =========================================================
# MAIN
# =========================================================

def main() -> None:
    print(f"\nDevice: {DEVICE}")
    print(f"Output: {OUT_DIR}\n")

    print("Loading models...")
    yolo_model = load_yolo(YOLO_PTH)
    model      = load_resnet50(WEIGHTS_PATH)
    print("All models loaded.\n")

    print("Loading validation metadata...")
    labels_dict = load_labels(LABELS_CSV)
    valid_keys  = [k for k in labels_dict if (IMG_DIR / f"{k}.jpg").exists()]
    print(f"Found {len(valid_keys)} valid images.\n")

    if not valid_keys:
        sys.exit("ERROR: No matching images found. Check IMG_DIR and CSV.")

    xai_targets = set(random.sample(valid_keys, min(10, len(valid_keys))))
    xai_data: list[dict] = []

    y_true:    list[int]   = []
    y_pred:    list[int]   = []
    latencies: list[float] = []

    print(f"Evaluating {len(valid_keys)} images on {DEVICE}...\n")

    for img_name in tqdm(valid_keys):
        try:
            true_label = labels_dict[img_name]
            true_idx   = CLASS_NAMES.index(true_label)
            img_path   = IMG_DIR / f"{img_name}.jpg"
            img_pil    = Image.open(img_path).convert("RGB")

            t0 = time.perf_counter()
            pred_idx, probs, crop = run_pipeline(img_pil, yolo_model, model)
            latencies.append(time.perf_counter() - t0)

            y_true.append(true_idx)
            y_pred.append(pred_idx)

            if img_name in xai_targets:
                crop_bgr = cv2.cvtColor(np.array(crop), cv2.COLOR_RGB2BGR)
                tensor   = preprocess(crop)
                heatmap  = gradcam_overlay(model, tensor, pred_idx, crop_bgr)
                xai_data.append({
                    "orig":    img_pil,
                    "crop":    crop,
                    "heatmap": heatmap,
                    "actual":  CLASS_NAMES[true_idx],
                    "pred":    CLASS_NAMES[pred_idx],
                })

        except Exception as e:
            print(f"\n  FAILED: {img_name} — {e}")

    if not y_true:
        sys.exit("ERROR: No images processed successfully.")

    acc  = accuracy_score(y_true, y_pred)
    bacc = balanced_accuracy_score(y_true, y_pred)
    prec, rec, f1, _ = precision_recall_fscore_support(
        y_true, y_pred, average="macro", zero_division=0
    )
    avg_lat = float(np.mean(latencies))
    fps     = 1.0 / avg_lat if avg_lat > 0 else 0.0
    ram_mb  = get_ram_mb()

    report = classification_report(
        y_true, y_pred, target_names=CLASS_NAMES, zero_division=0
    )
    cm = confusion_matrix(y_true, y_pred)

    lines = [
        "=" * 55,
        "ResNet50 Flat Pipeline — Validation Results",
        "=" * 55,
        f"Model            : ResNet50 (flat 7-class, 224×224)",
        f"Detector         : YOLOv12n (best2_repacked.pt)",
        f"Images processed : {len(y_true)}",
        f"Accuracy         : {acc:.4f}",
        f"Balanced Accuracy: {bacc:.4f}",
        f"Precision (macro): {prec:.4f}",
        f"Recall (macro)   : {rec:.4f}",
        f"F1 (macro)       : {f1:.4f}",
        f"Avg latency      : {avg_lat * 1000:.1f} ms",
        f"FPS              : {fps:.2f}",
        f"RAM usage        : {ram_mb:.1f} MB",
        f"Device           : {DEVICE}",
        "",
        "CLASSIFICATION REPORT",
        report,
        "",
        "CONFUSION MATRIX  (rows=true, cols=pred)",
        f"Classes: {CLASS_NAMES}",
        str(cm),
    ]

    summary = "\n".join(lines)
    print("\n" + summary)

    METRICS_PATH.write_text(summary, encoding="utf-8")
    print(f"\nMetrics → {METRICS_PATH}")

    if xai_data:
        print("\nRendering XAI report...")
        render_xai_report(xai_data, XAI_PATH)

    print("\nDONE.")


if __name__ == "__main__":
    main()
