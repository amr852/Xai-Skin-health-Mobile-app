#!/usr/bin/env python3
"""Test the flat ResNet50 classifier on the 7 locally-available ISIC classes.

Maps the 14-class model outputs back to the 7-class ground truth and reports
accuracy, per-class metrics, and Grad-CAM sanity check.

Usage:
  python model-server/scripts/test_resnet50.py
  python model-server/scripts/test_resnet50.py --max-per-class 50
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

_SCRIPT_DIR = Path(__file__).resolve().parent
_MODEL_SERVER = _SCRIPT_DIR.parent
if str(_MODEL_SERVER) not in sys.path:
    sys.path.insert(0, str(_MODEL_SERVER))

import config  # noqa: E402
from PIL import Image  # noqa: E402

# Map from local dataset folder names -> model's class name (as in ALL_CLASSES).
FOLDER_TO_MODEL_CLASS = {
    "actinic keratoses": "actinic keratoses",
    "basal cell carcinoma": "basal cell carcinoma",
    "benign keratosis-like lesions": "benign keratosis-like lesions",
    "dermatofibroma": "dermatofibroma",
    "melanocytic nevi": "melanocytic nevi",
    "melanoma": "melanoma",
    "vascular lesions": "vascular lesions",
}

SKIP_SUBSTRINGS = (
    "aug", "flip", "rot", "noise", "synthetic",
    "gen_", "generated", "downsampled", "copy",
)


def _file_hash(path: str) -> str:
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _is_valid_file(name: str) -> bool:
    lower = name.lower()
    if not lower.endswith((".jpg", ".jpeg", ".png")):
        return False
    return not any(s in lower for s in SKIP_SUBSTRINGS)


def collect_samples(root: str, max_per_class: int | None, seed: int) -> list[tuple[str, str]]:
    rng = random.Random(seed)
    samples: list[tuple[str, str]] = []
    seen_hashes: set[str] = set()

    for folder, model_class in FOLDER_TO_MODEL_CLASS.items():
        dp = os.path.join(root, folder)
        if not os.path.isdir(dp):
            print(f"  skip missing folder: {dp}")
            continue
        files = [f for f in os.listdir(dp) if _is_valid_file(f)]
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
            samples.append((path, model_class))
            picked += 1
            if max_per_class and picked >= max_per_class:
                break
        print(f"  {folder}: {picked} images")
    return samples


def main() -> int:
    parser = argparse.ArgumentParser(description="Test ResNet50 on 7 ISIC classes")
    parser.add_argument(
        "--dataset",
        default=os.environ.get(
            "ISIC_DATASET_DIR",
            r"C:\Users\admin\Downloads\combined_skin_dataset-20260503T220222Z-3-001\combined_skin_dataset",
        ),
    )
    parser.add_argument("--max-per-class", type=int, default=50)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--gradcam-samples", type=int, default=3,
                        help="Number of samples to test GradCAM on")
    parser.add_argument("--out", default=str(_MODEL_SERVER / "eval_results_resnet50"))
    args = parser.parse_args()

    if not os.path.isdir(args.dataset):
        print(f"Dataset not found: {args.dataset}")
        return 1

    print(f"Collecting samples from {args.dataset} ...")
    samples = collect_samples(args.dataset, args.max_per_class, args.seed)
    print(f"\nEvaluating {len(samples)} images across 7 classes\n")

    from services.classifier import lesion_classifier
    from services.explainer import gradcam_explainer

    y_true: list[str] = []
    y_pred: list[str] = []
    confidences: list[float] = []
    wrong_cases: list[dict] = []
    gradcam_ok = 0
    gradcam_tested = 0

    for i, (path, true_class) in enumerate(samples):
        img = Image.open(path).convert("RGB")
        out = lesion_classifier.predict(img, tag=f"eval_{i}")

        pred = out["specialist"]["label"]
        score = out["specialist"]["score"]
        y_true.append(true_class)
        y_pred.append(pred)
        confidences.append(score)

        if pred != true_class:
            wrong_cases.append({
                "path": path,
                "true": true_class,
                "pred": pred,
                "score": score,
                "top_k": out["specialist"].get("top_k"),
            })

        # Test GradCAM on a few samples.
        if gradcam_tested < args.gradcam_samples:
            cam_b64 = gradcam_explainer.overlay_for_lesion(img, out, tag=f"gradcam_test_{i}")
            gradcam_tested += 1
            if cam_b64 and len(cam_b64) > 100:
                gradcam_ok += 1
                print(f"  GradCAM OK for {os.path.basename(path)} -> {pred} (cam_b64 len={len(cam_b64)})")
            else:
                print(f"  GradCAM FAILED for {os.path.basename(path)}")

        if (i + 1) % 25 == 0:
            correct_so_far = sum(1 for t, p in zip(y_true, y_pred) if t == p)
            print(f"  ... {i + 1}/{len(samples)} (running acc={correct_so_far/(i+1):.3f})")

    # Compute metrics.
    correct = sum(1 for t, p in zip(y_true, y_pred) if t == p)
    accuracy = correct / len(y_true) if y_true else 0

    print("\n" + "=" * 70)
    print("RESULTS — ResNet50 Flat Classifier on 7 ISIC Classes")
    print("=" * 70)
    print(f"Total samples:   {len(samples)}")
    print(f"Correct:         {correct}")
    print(f"Accuracy:        {accuracy:.4f}")
    print(f"Mean confidence: {sum(confidences)/len(confidences):.4f}" if confidences else "")
    print(f"GradCAM:         {gradcam_ok}/{gradcam_tested} passed")
    print(f"Wrong cases:     {len(wrong_cases)}")

    # Per-class breakdown.
    print("\nPer-class accuracy:")
    labels = sorted(set(y_true))
    for lbl in labels:
        total = sum(1 for t in y_true if t == lbl)
        correct_lbl = sum(1 for t, p in zip(y_true, y_pred) if t == lbl and p == lbl)
        print(f"  {lbl:35s}: {correct_lbl}/{total} = {correct_lbl/total:.3f}")

    print(f"\nPrediction distribution: {dict(Counter(y_pred))}")

    # Try sklearn for more detailed report.
    try:
        from sklearn.metrics import classification_report, confusion_matrix, balanced_accuracy_score
        bacc = balanced_accuracy_score(y_true, y_pred)
        report = classification_report(y_true, y_pred, labels=labels, zero_division=0)
        cm = confusion_matrix(y_true, y_pred, labels=labels)
        print(f"\nBalanced accuracy: {bacc:.4f}")
        print(f"\n{report}")
    except ImportError:
        bacc = None
        report = None
        cm = None
        print("\n(sklearn not installed — skipping detailed report)")

    # Save results.
    os.makedirs(args.out, exist_ok=True)
    summary = {
        "model": "resnet50_flat_14class",
        "weights": config.RESNET50_WEIGHTS,
        "n_samples": len(samples),
        "accuracy": accuracy,
        "balanced_accuracy": bacc,
        "mean_confidence": sum(confidences) / len(confidences) if confidences else 0,
        "gradcam_pass": gradcam_ok,
        "gradcam_tested": gradcam_tested,
        "pred_distribution": dict(Counter(y_pred)),
        "per_class_correct": {
            lbl: sum(1 for t, p in zip(y_true, y_pred) if t == lbl and p == lbl)
            for lbl in labels
        },
        "per_class_total": {lbl: sum(1 for t in y_true if t == lbl) for lbl in labels},
    }
    with open(os.path.join(args.out, "summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    if report:
        with open(os.path.join(args.out, "classification_report.txt"), "w", encoding="utf-8") as f:
            f.write(report)
    if cm is not None:
        with open(os.path.join(args.out, "confusion_matrix.json"), "w", encoding="utf-8") as f:
            json.dump({"labels": labels, "matrix": cm.tolist()}, f, indent=2)
    with open(os.path.join(args.out, "wrong_cases.json"), "w", encoding="utf-8") as f:
        json.dump(wrong_cases[:100], f, indent=2)

    print(f"\nResults saved to {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
