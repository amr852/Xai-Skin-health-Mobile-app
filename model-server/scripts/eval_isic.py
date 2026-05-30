#!/usr/bin/env python3
"""Evaluate hierarchical classifier on local ISIC folder dataset.

Filters augmented/downsampled/non-image files. Produces confusion matrix,
per-class metrics, and confidence/entropy summaries.

Usage (from repo root):
  python model-server/scripts/eval_isic.py
  python model-server/scripts/eval_isic.py --max-per-class 100 --out model-server/eval_results
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
import sys
from collections import Counter
from pathlib import Path

# Allow `import config` / `services.*` when run from repo root or model-server/.
_SCRIPT_DIR = Path(__file__).resolve().parent
_MODEL_SERVER = _SCRIPT_DIR.parent
if str(_MODEL_SERVER) not in sys.path:
    sys.path.insert(0, str(_MODEL_SERVER))

import config  # noqa: E402
from PIL import Image  # noqa: E402

FOLDER_TO_DX = {
    "actinic keratoses": "akiec",
    "benign keratosis-like lesions": "bkl",
    "basal cell carcinoma": "bcc",
    "dermatofibroma": "df",
    "melanocytic nevi": "nv",
    "melanoma": "mel",
    "vascular lesions": "vasc",
}

SKIP_SUBSTRINGS = (
    "aug",
    "flip",
    "rot",
    "noise",
    "synthetic",
    "gen_",
    "generated",
    "downsampled",
    "copy",
)


def _file_hash(path: str) -> str:
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _is_valid_isic_file(name: str) -> bool:
    lower = name.lower()
    if not lower.endswith((".jpg", ".jpeg", ".png")):
        return False
    return not any(s in lower for s in SKIP_SUBSTRINGS)


def collect_samples(root: str, max_per_class: int | None, seed: int) -> list[tuple[str, str]]:
    rng = random.Random(seed)
    samples: list[tuple[str, str]] = []
    seen_hashes: set[str] = set()

    for folder, dx in FOLDER_TO_DX.items():
        dp = os.path.join(root, folder)
        if not os.path.isdir(dp):
            print(f"  skip missing folder: {dp}")
            continue
        files = [f for f in os.listdir(dp) if _is_valid_isic_file(f)]
        rng.shuffle(files)
        picked = 0
        for f in files:
            path = os.path.join(dp, f)
            try:
                digest = _file_hash(path)
            except OSError:
                continue
            if digest in seen_hashes:
                continue
            seen_hashes.add(digest)
            samples.append((path, dx))
            picked += 1
            if max_per_class and picked >= max_per_class:
                break
    return samples


def main() -> int:
    parser = argparse.ArgumentParser(description="ISIC local evaluation")
    parser.add_argument(
        "--dataset",
        default=os.environ.get(
            "ISIC_DATASET_DIR",
            r"C:\Users\admin\Downloads\combined_skin_dataset-20260503T220222Z-3-001\combined_skin_dataset",
        ),
    )
    parser.add_argument("--max-per-class", type=int, default=200)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--dual", action="store_true", help="Use crop+full fusion")
    parser.add_argument("--out", default=str(_MODEL_SERVER / "eval_results"))
    args = parser.parse_args()

    if not os.path.isdir(args.dataset):
        print(f"Dataset not found: {args.dataset}")
        return 1

    samples = collect_samples(args.dataset, args.max_per_class, args.seed)
    print(f"Evaluating {len(samples)} ISIC images (filtered) from {args.dataset}")

    from services.classifier import lesion_classifier  # noqa: WPS433 — lazy import loads weights once

    y_true: list[str] = []
    y_pred: list[str] = []
    y_primary_true: list[str] = []
    y_primary_pred: list[str] = []
    confidences: list[float] = []
    entropies: list[float] = []
    wrong_cases: list[dict] = []

    malignant_dx = {"bcc", "mel"}

    for i, (path, dx) in enumerate(samples):
        img = Image.open(path).convert("RGB")
        if args.dual:
            from services.lesion_crop import center_fallback_crop

            crop = center_fallback_crop(img)
            out = lesion_classifier.predict_dual(crop, img, tag=f"eval_{i}")
        else:
            out = lesion_classifier.predict(img, tag=f"eval_{i}")

        pred = out["specialist"]["label"]
        y_true.append(dx)
        y_pred.append(pred)
        confidences.append(out["specialist"]["score"])

        true_primary = "malignant" if dx in malignant_dx else "benign"
        y_primary_true.append(true_primary)
        y_primary_pred.append(out["primary"]["label"])

        unc = out.get("uncertainty") or {}
        if "entropy" in unc:
            entropies.append(float(unc["entropy"]))

        if pred != dx:
            wrong_cases.append(
                {
                    "path": path,
                    "true": dx,
                    "pred": pred,
                    "primary": out["primary"],
                    "score": out["specialist"]["score"],
                    "top_k": out["specialist"].get("top_k"),
                }
            )

        if (i + 1) % 50 == 0:
            print(f"  ... {i + 1}/{len(samples)}")

    # Metrics
    try:
        from sklearn.metrics import (
            accuracy_score,
            balanced_accuracy_score,
            classification_report,
            confusion_matrix,
        )
    except ImportError:
        print("sklearn not installed — printing raw counts only")
        correct = sum(1 for t, p in zip(y_true, y_pred) if t == p)
        print(f"Accuracy: {correct / len(y_true):.4f} ({correct}/{len(y_true)})")
        return 0

    labels = sorted(set(y_true) | set(y_pred))
    cm = confusion_matrix(y_true, y_pred, labels=labels)
    acc = accuracy_score(y_true, y_pred)
    bacc = balanced_accuracy_score(y_true, y_pred)
    primary_acc = accuracy_score(y_primary_true, y_primary_pred)
    report = classification_report(y_true, y_pred, labels=labels, zero_division=0)

    os.makedirs(args.out, exist_ok=True)
    summary = {
        "n_samples": len(samples),
        "accuracy": acc,
        "balanced_accuracy": bacc,
        "primary_routing_accuracy": primary_acc,
        "mean_confidence": sum(confidences) / len(confidences),
        "mean_entropy": sum(entropies) / len(entropies) if entropies else None,
        "pred_distribution": dict(Counter(y_pred)),
        "dual_inference": args.dual,
        "weights": {
            "primary": config.PRIMARY_WEIGHTS,
            "benign": config.BENIGN_WEIGHTS,
            "malignant": config.MALIGNANT_WEIGHTS,
        },
    }

    with open(os.path.join(args.out, "summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    with open(os.path.join(args.out, "classification_report.txt"), "w", encoding="utf-8") as f:
        f.write(report)
    with open(os.path.join(args.out, "confusion_matrix.json"), "w", encoding="utf-8") as f:
        json.dump({"labels": labels, "matrix": cm.tolist()}, f, indent=2)
    with open(os.path.join(args.out, "wrong_cases.json"), "w", encoding="utf-8") as f:
        json.dump(wrong_cases[:100], f, indent=2)

    # ASCII confusion matrix
    print("\n=== ISIC Evaluation Summary ===")
    print(f"Samples: {len(samples)}")
    print(f"7-class accuracy:       {acc:.4f}")
    print(f"7-class balanced acc:   {bacc:.4f}")
    print(f"Primary routing acc:    {primary_acc:.4f}")
    print(f"Mean confidence:        {summary['mean_confidence']:.4f}")
    print(f"Prediction distribution: {summary['pred_distribution']}")
    print(f"\n{report}")
    print(f"Results written to {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
