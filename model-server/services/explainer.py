"""PyTorch Grad-CAM for flat ResNet50 classifier.

`overlay_for_lesion` is generic — it runs Grad-CAM on whatever PIL image it is
given, using the target class from the matching classifier result. The route
calls it twice per request:
  - once on the padded bbox CROP for each detected lesion (heatmap aligns with
    crop_b64 shown next to it),
  - once on the FULL image for spatial context (whole_overlay_b64).

GradCAM target layer: model.layer4[-1]  (final bottleneck block, 2048-ch, before avgpool).
Output: the full image with the JET heatmap blended in, resized to
MAX_OVERLAY_SIDE on the longest dimension before base64 encoding.
"""

from __future__ import annotations

import base64
import io

import cv2
import numpy as np
import torch
from PIL import Image

import config
from services.preprocess import pil_to_tensor

MAX_OVERLAY_SIDE = 512


# ── Core GradCAM ──────────────────────────────────────────────────────────────

def _get_target_layer(model: "torch.nn.Module") -> "torch.nn.Module":
    """Return the GradCAM target layer for a given model architecture."""
    if hasattr(model, "layer4"):       # torchvision ResNet
        return model.layer4[-1]
    if hasattr(model, "_conv_head"):   # efficientnet_pytorch
        return model._conv_head
    return model.features[-1]          # torchvision EfficientNet fallback


def compute_gradcam_heatmap(
    model: "torch.nn.Module",
    tensor: "torch.Tensor",
    target_class: int,
) -> np.ndarray:
    """Return normalised H×W Grad-CAM float32 in [0,1].

    model must be in eval() mode; tensor shape (1,3,H,W).
    """
    feature_map: list = []
    gradients:   list = []

    def fwd_hook(_m, _i, output):
        feature_map.append(output.detach())

    def bwd_hook(_m, _gi, grad_output):
        gradients.append(grad_output[0].detach())

    target_layer = _get_target_layer(model)
    fh = target_layer.register_forward_hook(fwd_hook)
    bh = target_layer.register_full_backward_hook(bwd_hook)

    try:
        model.zero_grad()
        out = model(tensor)
        loss = out[0, target_class]
        loss.backward()
    finally:
        fh.remove()
        bh.remove()

    if not feature_map or not gradients:
        h = tensor.shape[2] // 32 or 1
        return np.zeros((h, h), dtype=np.float32)

    feat  = feature_map[0][0]
    grads = gradients[0][0]
    weights = grads.mean(dim=(1, 2), keepdim=True)
    cam = torch.relu((feat * weights).sum(dim=0))
    cam = cam.numpy()

    vmin, vmax = cam.min(), cam.max()
    if vmax > vmin:
        cam = (cam - vmin) / (vmax - vmin + 1e-8)
    return cam.astype(np.float32)


def _blend_heatmap(
    rgb: np.ndarray,
    heatmap: np.ndarray,
    alpha_img: float = 0.55,
) -> np.ndarray:
    h, w = rgb.shape[:2]
    cam_up = cv2.resize(heatmap, (w, h), interpolation=cv2.INTER_LINEAR)
    cam_u8  = (cam_up * 255).astype(np.uint8)
    heat_bgr = cv2.applyColorMap(cam_u8, cv2.COLORMAP_JET)
    orig_bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    return cv2.addWeighted(orig_bgr, alpha_img, heat_bgr, 1.0 - alpha_img, 0)


def _bgr_to_png_b64(img_bgr: np.ndarray, max_side: int = MAX_OVERLAY_SIDE) -> str:
    h, w = img_bgr.shape[:2]
    if max(h, w) > max_side:
        scale = max_side / max(h, w)
        img_bgr = cv2.resize(
            img_bgr,
            (max(1, int(w * scale)), max(1, int(h * scale))),
            interpolation=cv2.INTER_AREA,
        )
    ok, buf = cv2.imencode(".png", img_bgr)
    if not ok:
        raise RuntimeError("PNG encode failed")
    return base64.b64encode(buf.tobytes()).decode("utf-8")


def pil_to_png_b64(pil_image: Image.Image) -> str:
    bio = io.BytesIO()
    pil_image.save(bio, format="PNG")
    return base64.b64encode(bio.getvalue()).decode("utf-8")


# ── GradCAM explainer ─────────────────────────────────────────────────────────

class GradCAMExplainer:
    """Produces Grad-CAM overlays using the flat ResNet50 model."""

    def __init__(self) -> None:
        from services.classifier import lesion_classifier
        self._classifier = lesion_classifier

    def overlay_for_lesion(
        self,
        pil_image: Image.Image,
        classifier_result: dict,
        tag: str = "cam",
    ) -> str | None:
        """Return base64 PNG of pil_image with Grad-CAM overlay.

        pil_image         — image to explain: lesion crop for per-lesion overlays,
                            full image for whole-image spatial-context overlay.
        classifier_result — dict from FlatClassifier.predict() for that same image.
        """
        try:
            target = int(
                classifier_result.get("specialist_pred_idx",
                classifier_result.get("pred_idx", 0))
            )
            model  = self._classifier.model
            rgb    = pil_image.convert("RGB")
            tensor = pil_to_tensor(rgb)

            for p in model.parameters():
                p.requires_grad_(True)
            model.train(False)

            heatmap = compute_gradcam_heatmap(model, tensor, target)

            for p in model.parameters():
                p.requires_grad_(False)

            rgb_arr = np.array(rgb)
            overlay = _blend_heatmap(rgb_arr, heatmap, alpha_img=0.55)
            return _bgr_to_png_b64(overlay)
        except Exception as exc:
            if config.DEBUG_INFERENCE:
                print(f"[gradcam] {tag}: {exc}")
            return None


def paint_lesion_on_canvas(
    canvas_bgr: np.ndarray,
    x1: int, y1: int, x2: int, y2: int,
    crop_pil: Image.Image,
    classifier_result: dict,
) -> None:
    """Blend Grad-CAM inside the bbox region on the annotated canvas."""
    roi = canvas_bgr[y1:y2, x1:x2]
    if roi.size == 0:
        return
    try:
        from services.classifier import lesion_classifier

        target = int(
            classifier_result.get("specialist_pred_idx",
            classifier_result.get("pred_idx", 0))
        )
        model  = lesion_classifier.model
        rgb    = crop_pil.convert("RGB")
        tensor = pil_to_tensor(rgb)

        for p in model.parameters():
            p.requires_grad_(True)
        model.train(False)

        heatmap = compute_gradcam_heatmap(model, tensor, target)

        for p in model.parameters():
            p.requires_grad_(False)

        rh, rw = roi.shape[:2]
        cam_up = cv2.resize(heatmap, (rw, rh), interpolation=cv2.INTER_LINEAR)
        cam_u8 = (cam_up * 255).astype(np.uint8)
        heat   = cv2.applyColorMap(cam_u8, cv2.COLORMAP_JET)
        canvas_bgr[y1:y2, x1:x2] = cv2.addWeighted(roi, 0.55, heat, 0.45, 0)
    except Exception:
        pass
    cv2.rectangle(canvas_bgr, (x1, y1), (x2, y2), (255, 255, 255), 1)


gradcam_explainer = GradCAMExplainer()
