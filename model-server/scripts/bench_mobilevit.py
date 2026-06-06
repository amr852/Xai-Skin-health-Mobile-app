"""Edge-device architecture benchmark — MobileViT hierarchical pipeline.

Tests the 4-model ensemble (Direct 7-class + Primary→Benign/Malignant cascade)
against the HAM10000 validation set, using PyTorch .pth weights and ultralytics
YOLO detection.

Usage (from model-server/ with .venv active):
    python -m scripts.bench_mobilevit

Outputs (written to DOWNLOADS/edge_test_results/):
    metrics.txt   — accuracy, balanced-acc, precision, recall, F1, FPS, RAM
    xai_report.png — pseudo-CAM visualisation for 10 random samples

Model files expected in C:\\Users\\admin\\Downloads\\:
    best2.pt
    Direct 7-class Model 79 83.pth
    mobilevit_primary_classifier_focal_loss_best.pth
    mobilevit_benign_balanced_best.pth
    mobilevit_malignant_balanced_best.pth

Validation data:
    Validation Dataset/images/      (JPEG files named by image_id)
    Validation Dataset/validation_set_metadata.csv  (columns: image_id, dx)
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
from torchvision import transforms
from tqdm import tqdm

# =========================================================
# CONFIGURATION
# =========================================================

DOWNLOADS = Path(r"C:\Users\admin\Downloads")

YOLO_PTH        = DOWNLOADS / "best2_repacked.pt"
DIRECT_PTH      = DOWNLOADS / "Direct 7-class Model 79 83_repacked.pth"
PRIMARY_PTH     = DOWNLOADS / "mobilevit_primary_classifier_focal_loss_best_repacked.pth"
BENIGN_PTH      = DOWNLOADS / "mobilevit_benign_balanced_best_repacked.pth"
MALIGNANT_PTH   = DOWNLOADS / "mobilevit_malignant_balanced_best_repacked.pth"

VAL_DIR         = DOWNLOADS / "Validation Dataset"
IMG_DIR         = VAL_DIR / "images"
LABELS_CSV      = VAL_DIR / "validation_set_metadata.csv"

OUT_DIR         = DOWNLOADS / "edge_test_results"
OUT_DIR.mkdir(parents=True, exist_ok=True)
XAI_PATH        = OUT_DIR / "xai_report.png"
METRICS_PATH    = OUT_DIR / "metrics.txt"

# Archive root confirmed "best_mobilevit_s" → all 4 classifiers are mobilevit_s (~20 MB each)
MOBILEVIT_VARIANTS = ["mobilevit_s"]

# 7-class label order — must match training label_mapping (sorted HAM10000 dx codes)
CLASS_NAMES = ["akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"]

# Mapping from 7-class global index → specialist arrays
BENIGN_GLOBAL_IDX    = [0, 2, 3, 5, 6]   # akiec, bkl, df, nv, vasc
MALIGNANT_GLOBAL_IDX = [1, 4]             # bcc, mel

DIRECT_WEIGHT  = 0.65   # blending: final = direct*W + cascade*(1-W)
OPTIMAL_MULTS  = np.ones(7)

YOLO_CONF_THRESH = 0.25
YOLO_PAD         = 0.60   # 60 % box padding, matching original arch script

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# =========================================================
# PREPROCESSING
# =========================================================

_CLASSIFIER_TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])


def preprocess(img_pil: Image.Image) -> torch.Tensor:
    return _CLASSIFIER_TRANSFORM(img_pil).unsqueeze(0).to(DEVICE)


# =========================================================
# MODEL LOADING
# =========================================================

def _build_mobilevit(num_classes: int, variant: str) -> nn.Module:
    import timm
    return timm.create_model(variant, pretrained=False, num_classes=num_classes)


def _strip_dp(state_dict: dict) -> dict:
    """Remove DataParallel 'module.' prefix if present."""
    return {k.replace("module.", ""): v for k, v in state_dict.items()}


def load_classifier(path: Path, num_classes: int) -> nn.Module:
    """
    Load a .pth file into a MobileViT model.

    Strategy:
      1. Try torch.load as a full nn.Module (torch.save(model, ...)).
      2. Otherwise treat as a state dict (or checkpoint containing one).
         Attempt each MOBILEVIT_VARIANTS until load_state_dict succeeds.
    """
    print(f"  Loading {path.name} ({num_classes} classes) ...")
    try:
        raw = torch.load(str(path), map_location="cpu", weights_only=True)
    except Exception:
        # weights_only=True fails for full nn.Module saves (pickled objects).
        # Only proceed if you trust the source of these .pth files.
        print(f"    ! weights_only=True failed — retrying with full pickle (trusted source required)")
        raw = torch.load(str(path), map_location="cpu", weights_only=False)

    # ── Case 1: full model serialized ─────────────────────────────────────────
    if isinstance(raw, nn.Module):
        model = raw.to(DEVICE).eval()
        print(f"    → full nn.Module loaded directly")
        return model

    # ── Case 2: state dict (possibly nested in a checkpoint dict) ─────────────
    if isinstance(raw, dict):
        for key in ("model_state_dict", "state_dict", "model", "weights"):
            if key in raw:
                sd = _strip_dp(raw[key])
                break
        else:
            sd = _strip_dp(raw)
    else:
        raise TypeError(f"Unexpected checkpoint type: {type(raw)}")

    last_err: Optional[Exception] = None
    for variant in MOBILEVIT_VARIANTS:
        try:
            model = _build_mobilevit(num_classes, variant)
            missing, unexpected = model.load_state_dict(sd, strict=False)
            print(f"    → {variant}  missing={len(missing)}  unexpected={len(unexpected)}")
            if len(missing) == 0 or len(unexpected) == 0:
                break
        except Exception as e:
            last_err = e
            print(f"    ! {variant} failed: {e}")
            continue
    else:
        if last_err:
            raise RuntimeError(
                f"No MobileViT variant could load {path.name}"
            ) from last_err

    return model.to(DEVICE).eval()


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
    """Forward pass → softmax probabilities."""
    logits = model(tensor)
    if isinstance(logits, (list, tuple)):
        logits = logits[0]
    probs = torch.softmax(logits, dim=-1)[0].cpu().numpy()
    return probs


def detect_and_crop(yolo_model, img_pil: Image.Image) -> Image.Image:
    """Run YOLO; return padded crop of best detection or original if no hit."""
    results = yolo_model(img_pil, conf=YOLO_CONF_THRESH, verbose=False)
    boxes   = results[0].boxes

    if boxes is None or len(boxes) == 0:
        return img_pil

    # Pick highest-confidence box
    confs   = boxes.conf.cpu().numpy()
    best    = int(np.argmax(confs))
    xyxy    = boxes.xyxy[best].cpu().numpy()   # absolute pixels in orig image
    x1, y1, x2, y2 = xyxy

    w, h      = x2 - x1, y2 - y1
    pad_x     = w * YOLO_PAD
    pad_y     = h * YOLO_PAD
    orig_w, orig_h = img_pil.size

    cx1 = int(max(0, x1 - pad_x))
    cy1 = int(max(0, y1 - pad_y))
    cx2 = int(min(orig_w, x2 + pad_x))
    cy2 = int(min(orig_h, y2 + pad_y))

    if cx2 > cx1 and cy2 > cy1:
        return img_pil.crop((cx1, cy1, cx2, cy2))
    return img_pil


def run_pipeline(
    img_pil:         Image.Image,
    yolo_model,
    model_direct:    nn.Module,
    model_primary:   nn.Module,
    model_benign:    nn.Module,
    model_malignant: nn.Module,
) -> tuple[int, np.ndarray, Image.Image, nn.Module]:
    """
    Full inference pipeline.

    Returns:
        pred_idx      — argmax of blended probabilities
        final_probs   — blended probability vector (7,)
        crop          — PIL crop used for classification
        expert_model  — benign or malignant specialist (for XAI)
    """
    crop = detect_and_crop(yolo_model, img_pil)
    tensor = preprocess(crop)

    # ── Direct 7-class arm ────────────────────────────────────────────────────
    d_probs = classify(model_direct, tensor)           # shape (7,)

    # ── Hierarchical cascade arm ───────────────────────────────────────────────
    p_probs = classify(model_primary, tensor)          # shape (2,)  0=benign 1=malignant

    cascade_probs = np.zeros(7, dtype=np.float32)

    if np.argmax(p_probs) == 1:                        # malignant branch
        m_probs = classify(model_malignant, tensor)    # shape (2,)
        for i, g in enumerate(MALIGNANT_GLOBAL_IDX):
            cascade_probs[g] = m_probs[i]
        expert_model = model_malignant
    else:                                               # benign branch
        b_probs = classify(model_benign, tensor)       # shape (5,)
        for i, g in enumerate(BENIGN_GLOBAL_IDX):
            cascade_probs[g] = b_probs[i]
        expert_model = model_benign

    # ── Blend ─────────────────────────────────────────────────────────────────
    final_probs  = d_probs * DIRECT_WEIGHT + cascade_probs * (1.0 - DIRECT_WEIGHT)
    final_probs *= OPTIMAL_MULTS

    return int(np.argmax(final_probs)), final_probs, crop, expert_model


# =========================================================
# PSEUDO-CAM (forward hook on last Conv2d)
# =========================================================

_feat_cache: dict = {}


def _hook(module, input, output):
    _feat_cache["feat"] = output.detach()


def pseudo_cam_overlay(
    model: nn.Module,
    tensor: torch.Tensor,
    crop_bgr: np.ndarray,
) -> np.ndarray:
    """Capture last Conv2d spatial features → Viridis heatmap blended on crop."""
    try:
        last_conv: Optional[nn.Module] = None
        for m in model.modules():
            if isinstance(m, nn.Conv2d):
                last_conv = m

        if last_conv is None:
            return cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2RGB)

        handle = last_conv.register_forward_hook(_hook)
        with torch.no_grad():
            model(tensor)
        handle.remove()

        feat = _feat_cache.get("feat")
        if feat is None:
            return cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2RGB)

        cam = feat[0].cpu().numpy()          # (C, H, W)
        cam = np.mean(cam, axis=0)            # average channels → spatial map
        cam = np.maximum(cam, 0)
        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
        cam = cv2.resize(cam, (crop_bgr.shape[1], crop_bgr.shape[0]))

        heatmap = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_VIRIDIS)
        overlay = cv2.addWeighted(crop_bgr, 0.45, heatmap, 0.55, 0)
        return cv2.cvtColor(overlay, cv2.COLOR_BGR2RGB)

    except Exception as e:
        print(f"  PseudoCAM error: {e}")
        return cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2RGB)


# =========================================================
# UTILITY
# =========================================================

def get_ram_mb() -> float:
    return psutil.Process(os.getpid()).memory_info().rss / (1024 * 1024)


def load_labels(csv_path: Path) -> dict[str, str]:
    labels: dict[str, str] = {}
    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            img_id = row["image_id"].strip().removesuffix(".jpg")
            dx     = row["dx"].strip().lower()
            if dx in CLASS_NAMES:
                labels[img_id] = dx
    return labels


# =========================================================
# XAI REPORT RENDER
# =========================================================

def render_xai_report(xai_data: list[dict], out_path: Path) -> None:
    rows = len(xai_data)
    fig  = plt.figure(figsize=(18, rows * 5), facecolor="white")
    gs   = fig.add_gridspec(rows, 4, wspace=0.65, hspace=1.25)
    fig.suptitle(
        "Explainable AI — MobileViT Skin Lesion Pipeline",
        fontsize=22, fontweight="bold", y=0.995,
    )

    for i, d in enumerate(xai_data):
        correct = d["actual"] == d["pred"]

        ax0 = fig.add_subplot(gs[i, 0])
        ax0.imshow(d["orig"]); ax0.axis("off")
        ax0.set_title(f"Input: {d['actual'].capitalize()}", fontsize=12, pad=18)

        ax1 = fig.add_subplot(gs[i, 1])
        ax1.imshow(d["crop"]); ax1.axis("off")
        ax1.set_title("YOLO Crop", fontsize=12, pad=18)

        ax2 = fig.add_subplot(gs[i, 2])
        ax2.imshow(d["heatmap"]); ax2.axis("off")
        ax2.set_title("AI Focus (Pseudo-CAM)", fontsize=12,
                      color="darkred", fontweight="bold", pad=18)

        ax3 = fig.add_subplot(gs[i, 3])
        ax3.axis("off")
        ax3.text(0.05, 0.65, f"PREDICTED:\n{d['pred'].capitalize()}",
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

    # ── Load models ───────────────────────────────────────────────────────────
    print("Loading models...")
    yolo_model      = load_yolo(YOLO_PTH)
    model_direct    = load_classifier(DIRECT_PTH,    num_classes=7)
    model_primary   = load_classifier(PRIMARY_PTH,   num_classes=2)
    model_benign    = load_classifier(BENIGN_PTH,    num_classes=5)
    model_malignant = load_classifier(MALIGNANT_PTH, num_classes=2)
    print("All models loaded.\n")

    # ── Load labels ───────────────────────────────────────────────────────────
    print("Loading validation metadata...")
    labels_dict = load_labels(LABELS_CSV)

    valid_keys = [
        k for k in labels_dict
        if (IMG_DIR / f"{k}.jpg").exists()
    ]
    print(f"Found {len(valid_keys)} valid images.\n")

    if not valid_keys:
        sys.exit("ERROR: No matching images found. Check IMG_DIR and CSV.")

    xai_targets = set(random.sample(valid_keys, min(10, len(valid_keys))))
    xai_data: list[dict] = []

    # ── Evaluation loop ───────────────────────────────────────────────────────
    y_true: list[int] = []
    y_pred: list[int] = []
    latencies: list[float] = []

    print(f"Evaluating {len(valid_keys)} images on {DEVICE}...\n")

    for img_name in tqdm(valid_keys):
        try:
            true_idx  = CLASS_NAMES.index(labels_dict[img_name])
            img_path  = IMG_DIR / f"{img_name}.jpg"
            img_pil   = Image.open(img_path).convert("RGB")

            t0 = time.perf_counter()
            pred_idx, final_probs, crop, expert_model = run_pipeline(
                img_pil, yolo_model,
                model_direct, model_primary, model_benign, model_malignant,
            )
            latencies.append(time.perf_counter() - t0)

            y_true.append(true_idx)
            y_pred.append(pred_idx)

            if img_name in xai_targets:
                crop_bgr = cv2.cvtColor(np.array(crop), cv2.COLOR_RGB2BGR)
                tensor   = preprocess(crop)
                heatmap  = pseudo_cam_overlay(expert_model, tensor, crop_bgr)
                xai_data.append({
                    "orig":   img_pil,
                    "crop":   crop,
                    "heatmap": heatmap,
                    "actual": CLASS_NAMES[true_idx],
                    "pred":   CLASS_NAMES[pred_idx],
                })

        except Exception as e:
            print(f"\n  FAILED: {img_name} — {e}")

    # ── Metrics ───────────────────────────────────────────────────────────────
    if not y_true:
        sys.exit("ERROR: No images processed successfully.")

    acc   = accuracy_score(y_true, y_pred)
    bacc  = balanced_accuracy_score(y_true, y_pred)
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
        "=" * 50,
        "MobileViT Hierarchical Pipeline — Validation Results",
        "=" * 50,
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
        "CONFUSION MATRIX",
        str(cm),
    ]

    summary = "\n".join(lines)
    print("\n" + summary)

    METRICS_PATH.write_text(summary, encoding="utf-8")
    print(f"\nMetrics → {METRICS_PATH}")

    # ── XAI report ────────────────────────────────────────────────────────────
    if xai_data:
        print("\nRendering XAI report...")
        render_xai_report(xai_data, XAI_PATH)

    print("\nDONE.")


if __name__ == "__main__":
    main()
