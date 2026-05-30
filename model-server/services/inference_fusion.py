"""Dual-input (lesion crop + full image) hierarchical inference with confidence fusion."""

from __future__ import annotations

import json
import math
import os
from typing import Any

import torch
import torch.nn.functional as F

import config
from services.preprocess import pil_to_tensor, save_debug_input, tensor_debug_stats


def _entropy(probs: torch.Tensor) -> float:
    p = probs.clamp(min=1e-8)
    return float(-(p * p.log()).sum().item())


def _softmax_logits(logits: torch.Tensor) -> torch.Tensor:
    temp = max(config.INFERENCE_TEMPERATURE, 1e-6)
    return F.softmax(logits / temp, dim=1)


def _fuse_logits(
    logits_a: torch.Tensor,
    logits_b: torch.Tensor,
    weight_a: float,
    weight_b: float,
) -> torch.Tensor:
    """Confidence-weighted logit fusion (lower entropy -> higher weight)."""
    pa = _softmax_logits(logits_a)[0]
    pb = _softmax_logits(logits_b)[0]
    ea = _entropy(pa)
    eb = _entropy(pb)
    # Convert entropy to confidence weight (high entropy = uncertain = lower weight).
    ca = math.exp(-ea) * weight_a
    cb = math.exp(-eb) * weight_b
    total = ca + cb
    if total <= 0:
        return (logits_a + logits_b) / 2.0
    wa, wb = ca / total, cb / total
    return logits_a * wa + logits_b * wb


def _top_k_from_logits(logits: torch.Tensor, labels: list[str], k: int = 3) -> list[dict]:
    probs = _softmax_logits(logits)[0]
    k = min(k, probs.numel())
    vals, idxs = torch.topk(probs, k=k)
    out = []
    for v, i in zip(vals.tolist(), idxs.tolist()):
        lbl = labels[i] if i < len(labels) else str(i)
        out.append(
            {
                "label": lbl,
                "display": config.get_display(lbl),
                "score": float(v),
            }
        )
    return out


class DualInputFusion:
    """Run crop + full-image inference and fuse like notebook hierarchical eval + TTA."""

    def __init__(self, classifier):
        self.clf = classifier

    def _branch_logits(self, pil_image) -> dict[str, Any]:
        tensor = pil_to_tensor(pil_image).unsqueeze(0).to(self.clf.device)
        primary_logits = self.clf._forward(self.clf.primary, tensor)
        primary_probs = _softmax_logits(primary_logits)[0]
        primary_idx = int(primary_logits.argmax(dim=1).item())
        primary_label = self.clf.primary_labels[primary_idx]

        if primary_label.strip().lower() == "malignant":
            spec_key = "malignant"
            spec_net = self.clf.malignant
            spec_labels = self.clf.malignant_labels
        else:
            spec_key = "benign"
            spec_net = self.clf.benign
            spec_labels = self.clf.benign_labels

        spec_logits = self.clf._forward(spec_net, tensor)
        spec_idx = int(spec_logits.argmax(dim=1).item())
        spec_label = spec_labels[spec_idx] if spec_idx < len(spec_labels) else str(spec_idx)

        return {
            "tensor_stats": tensor_debug_stats(tensor[0]),
            "primary_logits": primary_logits,
            "primary_probs": primary_probs.tolist(),
            "primary_label": primary_label,
            "primary_idx": primary_idx,
            "specialist_key": spec_key,
            "specialist_logits": spec_logits,
            "specialist_label": spec_label,
            "specialist_idx": spec_idx,
            "specialist_labels": spec_labels,
        }

    def predict(
        self,
        crop_pil,
        full_pil,
        tag: str = "lesion",
    ) -> dict[str, Any]:
        crop_area = crop_pil.size[0] * crop_pil.size[1]
        full_area = max(1, full_pil.size[0] * full_pil.size[1])
        crop_fraction = crop_area / full_area

        # Dermoscopy-style frames where crop ≈ full image: skip fusion (notebook path).
        if crop_fraction >= config.FUSION_SKIP_WHEN_CROP_COVERS:
            single = self.clf._predict_single(full_pil, tag=tag)
            single.pop("_tensor", None)
            single.pop("_specialist_logits", None)
            single["fusion_debug"] = {
                "tag": tag,
                "mode": "full_only",
                "crop_fraction": crop_fraction,
                "reason": "crop covers most of frame — using full-image notebook path",
            }
            single["crop_only"] = {"primary": single["primary"]["label"], "specialist": single["specialist"]["label"]}
            single["full_only"] = single["crop_only"]
            return single

        crop_branch = self._branch_logits(crop_pil)
        full_branch = self._branch_logits(full_pil)

        w_crop = config.FUSION_CROP_WEIGHT
        w_full = config.FUSION_FULL_WEIGHT

        fused_primary = _fuse_logits(
            crop_branch["primary_logits"],
            full_branch["primary_logits"],
            w_crop,
            w_full,
        )
        fused_primary_probs = _softmax_logits(fused_primary)[0]
        fused_primary_idx = int(fused_primary.argmax(dim=1).item())
        fused_primary_label = self.clf.primary_labels[fused_primary_idx]

        if fused_primary_label.strip().lower() == "malignant":
            spec_key = "malignant"
            spec_labels = self.clf.malignant_labels
            crop_spec = self.clf._forward(
                self.clf.malignant,
                pil_to_tensor(crop_pil).unsqueeze(0).to(self.clf.device),
            )
            full_spec = self.clf._forward(
                self.clf.malignant,
                pil_to_tensor(full_pil).unsqueeze(0).to(self.clf.device),
            )
        else:
            spec_key = "benign"
            spec_labels = self.clf.benign_labels
            crop_spec = self.clf._forward(
                self.clf.benign,
                pil_to_tensor(crop_pil).unsqueeze(0).to(self.clf.device),
            )
            full_spec = self.clf._forward(
                self.clf.benign,
                pil_to_tensor(full_pil).unsqueeze(0).to(self.clf.device),
            )

        fused_spec = _fuse_logits(crop_spec, full_spec, w_crop, w_full)
        fused_spec_probs = _softmax_logits(fused_spec)[0]
        fused_spec_idx = int(fused_spec.argmax(dim=1).item())
        fused_spec_label = (
            spec_labels[fused_spec_idx]
            if fused_spec_idx < len(spec_labels)
            else str(fused_spec_idx)
        )

        low_confidence = float(fused_spec_probs[fused_spec_idx].item()) < config.LOW_CONFIDENCE_THRESHOLD
        fused_entropy = _entropy(fused_spec_probs)

        debug_payload = {
            "tag": tag,
            "crop_primary": crop_branch["primary_label"],
            "crop_specialist": crop_branch["specialist_label"],
            "full_primary": full_branch["primary_label"],
            "full_specialist": full_branch["specialist_label"],
            "fused_primary": fused_primary_label,
            "fused_specialist": fused_spec_label,
            "crop_tensor": crop_branch["tensor_stats"],
            "full_tensor": full_branch["tensor_stats"],
            "crop_primary_probs": crop_branch["primary_probs"],
            "full_primary_probs": full_branch["primary_probs"],
            "fused_primary_probs": fused_primary_probs.tolist(),
            "fused_specialist_probs": fused_spec_probs.tolist(),
            "specialist_entropy": fused_entropy,
            "low_confidence": low_confidence,
            "fusion_weights": {"crop": w_crop, "full": w_full},
        }

        if config.DEBUG_INFERENCE:
            os.makedirs(config.INFERENCE_DEBUG_DIR, exist_ok=True)
            save_debug_input(crop_pil, pil_to_tensor(crop_pil), f"{tag}_crop")
            save_debug_input(full_pil, pil_to_tensor(full_pil), f"{tag}_full")
            log_path = os.path.join(config.INFERENCE_DEBUG_DIR, f"{tag}_fusion.json")
            with open(log_path, "w", encoding="utf-8") as f:
                json.dump(debug_payload, f, indent=2)
            print(f"[fusion] {tag}: crop={crop_branch['specialist_label']} "
                  f"full={full_branch['specialist_label']} -> fused={fused_spec_label} "
                  f"conf={fused_spec_probs[fused_spec_idx]:.3f} entropy={fused_entropy:.3f}")

        top_k = _top_k_from_logits(fused_spec, spec_labels, k=min(3, len(spec_labels)))

        return {
            "primary": {
                "label": fused_primary_label,
                "display": config.get_display(fused_primary_label),
                "score": float(fused_primary_probs[fused_primary_idx].item()),
            },
            "specialist": {
                "label": fused_spec_label,
                "display": config.get_display(fused_spec_label),
                "score": float(fused_spec_probs[fused_spec_idx].item()),
                "top_k": top_k,
            },
            "specialist_model_key": spec_key,
            "specialist_pred_idx": fused_spec_idx,
            "label": fused_spec_label,
            "display": config.get_display(fused_spec_label),
            "score": float(fused_spec_probs[fused_spec_idx].item()),
            "top_k": top_k,
            "pred_idx": fused_spec_idx,
            "uncertainty": {
                "entropy": fused_entropy,
                "low_confidence": low_confidence,
                "warning": config.LOW_CONFIDENCE_MESSAGE if low_confidence else None,
            },
            "fusion_debug": debug_payload,
            "crop_only": {
                "primary": crop_branch["primary_label"],
                "specialist": crop_branch["specialist_label"],
            },
            "full_only": {
                "primary": full_branch["primary_label"],
                "specialist": full_branch["specialist_label"],
            },
            # Raw logits for downstream GradCAM target resolution.
            "_fused_spec_logits": fused_spec,
            "_spec_key": spec_key,
        }
