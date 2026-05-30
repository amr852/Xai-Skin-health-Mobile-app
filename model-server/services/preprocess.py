"""Image preprocessing for MobileNetV2 Keras inference.

Preprocessing: resize to IMG_SIZE, apply MobileNetV2 preprocess_input
(maps [0,255] → [-1,1]). PIL + EXIF + ICC->sRGB for phone JPEGs.
"""

from __future__ import annotations

import io
import os

import numpy as np
from PIL import Image, ImageCms, ImageOps

import config

_SRGB_PROFILE = ImageCms.createProfile("sRGB")


def open_rgb_pil(raw_bytes: bytes) -> Image.Image:
    """Decode bytes to RGB PIL with EXIF orientation + ICC->sRGB conversion."""
    img = Image.open(io.BytesIO(raw_bytes))
    img.load()
    icc = img.info.get("icc_profile")
    if icc:
        try:
            src_profile = ImageCms.ImageCmsProfile(io.BytesIO(icc))
            img = ImageCms.profileToProfile(
                img, src_profile, _SRGB_PROFILE, outputMode="RGB"
            )
        except Exception:
            img = img.convert("RGB")
    else:
        img = img.convert("RGB")
    return ImageOps.exif_transpose(img).convert("RGB")


def open_rgb_path(path: str) -> Image.Image:
    with open(path, "rb") as f:
        return open_rgb_pil(f.read())


def pil_to_array(pil_image: Image.Image) -> np.ndarray:
    """PIL RGB → (1, IMG_SIZE, IMG_SIZE, 3) float32 with MobileNetV2 preprocessing."""
    import tensorflow as tf
    rgb = pil_image.convert("RGB").resize(
        (config.IMG_SIZE, config.IMG_SIZE), Image.BILINEAR
    )
    arr = np.array(rgb, dtype=np.float32)
    arr = tf.keras.applications.mobilenet_v2.preprocess_input(arr)
    return np.expand_dims(arr, axis=0)


def flip_array(arr: np.ndarray, axis: int) -> np.ndarray:
    """Flip a (1, H, W, C) array along H(1) or W(2)."""
    return np.flip(arr, axis=axis).copy()
