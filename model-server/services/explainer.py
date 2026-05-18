"""Grad-CAM utilities for the hierarchical pipeline.

Grad-CAM is always run against the *specialist* model (benign or malignant
head) — the one whose decision the user is being asked to trust.
"""

from __future__ import annotations

import base64
import io

import cv2
import numpy as np
import torch
from PIL import Image
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget

import config
from services.classifier import DEVICE, lesion_classifier, transform


def _pick_specialist(key: str):
    if key == "malignant":
        return lesion_classifier.malignant, lesion_classifier.target_layers["malignant"]
    return lesion_classifier.benign, lesion_classifier.target_layers["benign"]


def compute_gradcam_heatmap(
    model: torch.nn.Module,
    target_layer: torch.nn.Module,
    image_tensor: torch.Tensor,
    target_class: int,
) -> np.ndarray:
    """Normalised H×W Grad-CAM heatmap in [0, 1] for an arbitrary model."""
    tensor_in = image_tensor.clone().detach()
    with GradCAM(model=model, target_layers=[target_layer]) as cam:
        grayscale_cam = cam(
            input_tensor=tensor_in,
            targets=[ClassifierOutputTarget(target_class)],
        )[0, :]
    g = np.asarray(grayscale_cam, dtype=np.float32)
    g = np.maximum(g, 0)
    if g.max() > g.min():
        g = (g - g.min()) / (g.max() - g.min() + 1e-8)
    return g


def overlay_cam_on_pil(
    original_pil: Image.Image,
    heatmap: np.ndarray,
    alpha_orig: float = 0.6,
    alpha_heat: float = 0.4,
) -> np.ndarray:
    h, w = original_pil.height, original_pil.width
    cam_u8 = cv2.resize((heatmap * 255).astype(np.uint8), (w, h))
    heat = cv2.applyColorMap(cam_u8, cv2.COLORMAP_JET)
    orig = cv2.cvtColor(np.array(original_pil), cv2.COLOR_RGB2BGR)
    return cv2.addWeighted(orig, alpha_orig, heat, alpha_heat, 0)


def blend_heatmap_on_roi(
    roi_bgr: np.ndarray, heatmap_small: np.ndarray, alpha_roi: float = 0.55
) -> np.ndarray:
    rh, rw = roi_bgr.shape[:2]
    cam_u8 = cv2.resize(
        (heatmap_small * 255).astype(np.uint8), (rw, rh), interpolation=cv2.INTER_CUBIC
    )
    heat = cv2.applyColorMap(cam_u8, cv2.COLORMAP_JET)
    return cv2.addWeighted(roi_bgr, alpha_roi, heat, 1.0 - alpha_roi, 0)


def paint_lesion_on_canvas(
    canvas_bgr: np.ndarray,
    x1: int,
    y1: int,
    x2: int,
    y2: int,
    crop_pil: Image.Image,
    classifier_result: dict,
) -> None:
    """Blend specialist Grad-CAM inside bbox; draw white border on canvas."""
    roi = canvas_bgr[y1:y2, x1:x2]
    if roi.size == 0:
        return
    try:
        model, target_layer = _pick_specialist(
            classifier_result.get("specialist_model_key", "benign")
        )
        tensor = transform(crop_pil).unsqueeze(0).to(DEVICE)
        heatmap = compute_gradcam_heatmap(
            model,
            target_layer,
            tensor,
            int(classifier_result.get("specialist_pred_idx", 0)),
        )
        cw, ch = crop_pil.size
        heat224 = cv2.resize(
            heatmap,
            (config.IMG_SIZE, config.IMG_SIZE),
            interpolation=cv2.INTER_CUBIC,
        )
        heat_roi = cv2.resize(heat224, (cw, ch), interpolation=cv2.INTER_CUBIC)
        blended = blend_heatmap_on_roi(roi.copy(), heat_roi, alpha_roi=0.55)
        canvas_bgr[y1:y2, x1:x2] = blended
    except Exception:
        pass
    cv2.rectangle(canvas_bgr, (x1, y1), (x2, y2), (255, 255, 255), 2)


def numpy_bgr_to_png_b64(img_bgr: np.ndarray) -> str:
    ok, buf = cv2.imencode(".png", img_bgr)
    if not ok:
        raise RuntimeError("PNG encode failed")
    return base64.b64encode(buf.tobytes()).decode("utf-8")


def pil_to_png_b64(pil_image: Image.Image) -> str:
    bio = io.BytesIO()
    pil_image.save(bio, format="PNG")
    return base64.b64encode(bio.getvalue()).decode("utf-8")


class GradCAMExplainer:
    """Fail-soft GradCAM for crops; callers handle None overlay."""

    def overlay_for_lesion(
        self,
        crop_pil: Image.Image,
        classifier_result: dict,
    ) -> str | None:
        """PNG (base64) of the crop with specialist Grad-CAM blended in."""
        try:
            size = config.IMG_SIZE
            crop_square = crop_pil.convert("RGB")
            if crop_square.size != (size, size):
                crop_square = crop_square.resize((size, size), Image.LANCZOS)
            model, target_layer = _pick_specialist(
                classifier_result.get("specialist_model_key", "benign")
            )
            tensor = transform(crop_square).unsqueeze(0).to(DEVICE)
            heatmap = compute_gradcam_heatmap(
                model,
                target_layer,
                tensor,
                int(classifier_result.get("specialist_pred_idx", 0)),
            )
            heat_sq = cv2.resize(heatmap, (size, size), interpolation=cv2.INTER_CUBIC)
            roi_bgr = cv2.cvtColor(np.array(crop_square), cv2.COLOR_RGB2BGR)
            blended = blend_heatmap_on_roi(roi_bgr, heat_sq, alpha_roi=0.55)
            return numpy_bgr_to_png_b64(blended)
        except Exception:
            return None


gradcam_explainer = GradCAMExplainer()
