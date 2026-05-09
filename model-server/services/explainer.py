"""Grad-CAM utilities: legacy full-frame overlay and bbox-local overlays."""

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
from services.classifier import model, target_layer, transform, DEVICE


def compute_gradcam_heatmap(
    image_tensor: torch.Tensor, target_class: int
) -> np.ndarray:
    """Normalised H×W Grad-CAM heatmap in [0, 1]."""
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
    """Blend Grad-CAM over the full PIL image; returns BGR ndarray."""
    h, w = original_pil.height, original_pil.width
    cam_u8 = cv2.resize((heatmap * 255).astype(np.uint8), (w, h))
    heat = cv2.applyColorMap(cam_u8, cv2.COLORMAP_JET)
    orig = cv2.cvtColor(np.array(original_pil), cv2.COLOR_RGB2BGR)
    return cv2.addWeighted(orig, alpha_orig, heat, alpha_heat, 0)


def blend_heatmap_on_roi(
    roi_bgr: np.ndarray, heatmap_small: np.ndarray, alpha_roi: float = 0.55
) -> np.ndarray:
    """Resize heatmap to ROI and JET-blend with alpha_heat = 1 - alpha_roi."""
    rh, rw = roi_bgr.shape[:2]
    cam_u8 = cv2.resize(
        (heatmap_small * 255).astype(np.uint8), (rw, rh), interpolation=cv2.INTER_CUBIC
    )
    heat = cv2.applyColorMap(cam_u8, cv2.COLORMAP_JET)
    return cv2.addWeighted(roi_bgr, alpha_roi, heat, 1.0 - alpha_roi, 0)


def draw_label_pill_below_roi(
    roi_with_border: np.ndarray, text: str
) -> np.ndarray:
    """Append a dark strip under the ROI and draw white text (single line)."""
    h, w = roi_with_border.shape[:2]
    pad = 26
    canvas = np.zeros((h + pad, w, 3), dtype=np.uint8)
    canvas[:h, :w] = roi_with_border
    canvas[h:, :] = (30, 30, 30)
    font = cv2.FONT_HERSHEY_SIMPLEX
    scale = max(0.35, min(0.7, w / 400.0))
    thickness = 1
    (tw, th), _ = cv2.getTextSize(text, font, scale, thickness)
    tx = max(4, (w - tw) // 2)
    ty = h + pad - 8
    cv2.putText(canvas, text, (tx, ty), font, scale, (255, 255, 255), thickness, cv2.LINE_AA)
    return canvas


def paint_lesion_on_canvas(
    canvas_bgr: np.ndarray,
    x1: int,
    y1: int,
    x2: int,
    y2: int,
    crop_pil: Image.Image,
    pred_idx: int,
    label: str,
    score: float,
) -> None:
    """Blend CAM inside bbox, draw border and caption on full-frame BGR canvas."""
    roi = canvas_bgr[y1:y2, x1:x2]
    if roi.size == 0:
        return
    try:
        tensor = transform(crop_pil).unsqueeze(0).to(DEVICE)
        heatmap = compute_gradcam_heatmap(tensor, pred_idx)
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
    text = f"{label} {score:.2f}"
    font = cv2.FONT_HERSHEY_SIMPLEX
    bw = max(1, x2 - x1)
    scale = float(max(0.35, min(0.75, bw / 220.0)))
    thickness = 1
    (tw, th), _ = cv2.getTextSize(text, font, scale, thickness)
    tx = x1
    ty = min(y2 + th + 10, canvas_bgr.shape[0] - 4)
    pad_x, pad_y = 4, 3
    x0 = max(0, tx - pad_x)
    x1b = min(canvas_bgr.shape[1] - 1, tx + tw + pad_x)
    y0 = max(0, ty - th - pad_y)
    y1b = min(canvas_bgr.shape[0] - 1, ty + pad_y)
    cv2.rectangle(canvas_bgr, (x0, y0), (x1b, y1b), (40, 40, 40), -1)
    cv2.putText(
        canvas_bgr,
        text,
        (tx, ty),
        font,
        scale,
        (255, 255, 255),
        thickness,
        cv2.LINE_AA,
    )


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
        pred_idx: int,
        label: str,
        score: float,
    ) -> str | None:
        """
        Build a PNG (base64) of the crop with CAM inside bbox, border, and label strip.
        """
        try:
            tensor = transform(crop_pil).unsqueeze(0).to(DEVICE)
            heatmap = compute_gradcam_heatmap(tensor, pred_idx)
            heat224 = cv2.resize(
                heatmap,
                (config.IMG_SIZE, config.IMG_SIZE),
                interpolation=cv2.INTER_CUBIC,
            )
            cw, ch = crop_pil.size
            heat_roi = cv2.resize(
                heat224, (cw, ch), interpolation=cv2.INTER_CUBIC
            )
            roi_bgr = cv2.cvtColor(np.array(crop_pil.convert("RGB")), cv2.COLOR_RGB2BGR)
            blended = blend_heatmap_on_roi(roi_bgr, heat_roi, alpha_roi=0.55)
            cv2.rectangle(blended, (0, 0), (cw - 1, ch - 1), (255, 255, 255), 2)
            text = f"{label} {score:.2f}"
            out = draw_label_pill_below_roi(blended, text)
            return numpy_bgr_to_png_b64(out)
        except Exception:
            return None


gradcam_explainer = GradCAMExplainer()
