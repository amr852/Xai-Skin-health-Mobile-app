"""Keras Grad-CAM explainer for MobileNetV2 7-class classifier.

Uses tf.GradientTape to compute gradients of the predicted class score
w.r.t. out_relu (last feature map before global avg pool), then blends
the resulting heatmap over the input image.
"""

from __future__ import annotations

import base64
import io

import cv2
import numpy as np
from PIL import Image

import config
from services.preprocess import pil_to_array


def _build_gradcam_model(keras_model):
    """Sub-model outputting [conv_features, predictions] for GradCAM."""
    import tensorflow as tf
    conv_layer = keras_model.get_layer(config.GRADCAM_LAYER)
    return tf.keras.Model(
        inputs=keras_model.inputs,
        outputs=[conv_layer.output, keras_model.output],
    )


def compute_gradcam_heatmap(
    gradcam_model,
    arr: np.ndarray,
    target_class: int,
) -> np.ndarray:
    """Return normalised H×W Grad-CAM in [0,1].

    Uses tf.Variable (auto-watched) so gradients flow through the conv layer.
    Keras 3.14 wraps multi-output models in a list — we unwrap as needed.
    """
    import tensorflow as tf

    arr_var = tf.Variable(arr, dtype=tf.float32)
    with tf.GradientTape() as tape:
        result = gradcam_model(arr_var, training=False)
        conv_out = result[0]
        raw_preds = result[1]
        # Keras 3.14 may nest the final output in a list
        preds = raw_preds[0] if isinstance(raw_preds, list) else raw_preds
        loss = preds[0, target_class]

    grads = tape.gradient(loss, conv_out)           # (1, h, w, C)
    if grads is None:
        return np.zeros(conv_out.shape[1:3], dtype=np.float32)

    pooled = tf.reduce_mean(grads, axis=(0, 1, 2))  # (C,)
    features = conv_out[0]                           # (h, w, C)
    heatmap = tf.reduce_sum(features * pooled, axis=-1)  # (h, w)
    heatmap = tf.maximum(heatmap, 0).numpy()

    vmin, vmax = heatmap.min(), heatmap.max()
    if vmax > vmin:
        heatmap = (heatmap - vmin) / (vmax - vmin + 1e-8)
    return heatmap.astype(np.float32)


def upsample_heatmap(heatmap: np.ndarray, out_h: int, out_w: int) -> np.ndarray:
    return cv2.resize(heatmap, (out_w, out_h), interpolation=cv2.INTER_LINEAR)


def blend_heatmap_on_rgb(
    rgb: np.ndarray,
    heatmap: np.ndarray,
    alpha_img: float = 0.55,
) -> np.ndarray:
    """Overlay JET heatmap on RGB uint8 array; returns BGR."""
    h, w = rgb.shape[:2]
    heat_up = upsample_heatmap(heatmap, h, w)
    cam_u8 = (heat_up * 255).astype(np.uint8)
    heat_bgr = cv2.applyColorMap(cam_u8, cv2.COLORMAP_JET)
    orig_bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    return cv2.addWeighted(orig_bgr, alpha_img, heat_bgr, 1.0 - alpha_img, 0)


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
    """Grad-CAM over the Keras MobileNetV2 classifier."""

    def __init__(self) -> None:
        from services.classifier import lesion_classifier
        self._gradcam_model = _build_gradcam_model(lesion_classifier.model)

    def overlay_for_lesion(
        self,
        pil_image: Image.Image,
        classifier_result: dict,
        tag: str = "cam",
    ) -> str | None:
        """Return base64 PNG of pil_image with Grad-CAM overlay for predicted class."""
        try:
            rgb = pil_image.convert("RGB")
            arr = pil_to_array(rgb)
            target_idx = int(
                classifier_result.get("pred_idx",
                classifier_result.get("specialist_pred_idx", 0))
            )
            heatmap = compute_gradcam_heatmap(self._gradcam_model, arr, target_idx)
            rgb_arr = np.array(rgb)
            overlay_bgr = blend_heatmap_on_rgb(rgb_arr, heatmap, alpha_img=0.55)
            return numpy_bgr_to_png_b64(overlay_bgr)
        except Exception as exc:
            if config.DEBUG_INFERENCE:
                print(f"[gradcam] failed {tag}: {exc}")
            return None


def paint_lesion_on_canvas(
    canvas_bgr: np.ndarray,
    x1: int, y1: int, x2: int, y2: int,
    crop_pil: Image.Image,
    classifier_result: dict,
) -> None:
    """Blend Grad-CAM inside the bbox on an annotated canvas."""
    roi = canvas_bgr[y1:y2, x1:x2]
    if roi.size == 0:
        return
    try:
        from services.classifier import lesion_classifier
        gradcam_model = _build_gradcam_model(lesion_classifier.model)
        rgb = crop_pil.convert("RGB")
        arr = pil_to_array(rgb)
        target_idx = int(
            classifier_result.get("pred_idx",
            classifier_result.get("specialist_pred_idx", 0))
        )
        heatmap = compute_gradcam_heatmap(gradcam_model, arr, target_idx)
        rh, rw = roi.shape[:2]
        heat_roi = upsample_heatmap(heatmap, rh, rw)
        cam_u8 = (heat_roi * 255).astype(np.uint8)
        heat = cv2.applyColorMap(cam_u8, cv2.COLORMAP_JET)
        blended = cv2.addWeighted(roi, 0.55, heat, 0.45, 0)
        canvas_bgr[y1:y2, x1:x2] = blended
    except Exception:
        pass
    cv2.rectangle(canvas_bgr, (x1, y1), (x2, y2), (255, 255, 255), 2)


gradcam_explainer = GradCAMExplainer()
