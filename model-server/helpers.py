"""Shared image I/O and quality-enhancement helpers."""

from __future__ import annotations

import base64
import os
import tempfile
from datetime import datetime, timezone

import io

import cv2
import numpy as np
from PIL import Image

import config
from services.preprocess import open_rgb_pil
from image_quality import (
    blur_variance,
    brightness_score,
    enhance_blurry_image,
    enhance_low_light_image,
    is_blurry,
    is_low_light,
)


def save_image(image: np.ndarray, filename: str) -> str:
    path = os.path.join(config.UPLOAD_FOLDER, filename)
    cv2.imwrite(path, image)
    return path


def load_pil(image_name: str) -> Image.Image:
    path = os.path.join(config.UPLOAD_FOLDER, image_name)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Image not found: {image_name}")
    return Image.open(path).convert("RGB")


def to_base64(image_path: str) -> str:
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def _read_upload_rgb(file_storage) -> Image.Image:
    raw = file_storage.read()
    if not raw:
        raise ValueError("Could not read image")
    try:
        file_storage.stream.seek(0)
    except Exception:
        pass
    return open_rgb_pil(raw)


def save_enhanced_pair_from_upload(file_storage, id_prefix: str) -> dict:
    """
    Save upload to temp path, run blur/low-light enhancement, persist original + enhanced.

    Returns dict with original_image_name, enhanced_image_name, enhancements_applied,
    quality_* fields, img_pil (RGB enhanced).

    Uses PIL loader (`_open_upload_pil`) for color/orientation correctness, then
    drops to BGR ndarray for the existing cv2-based enhancement helpers.
    """
    ext = os.path.splitext(file_storage.filename)[1] or ".jpg"
    pil_oriented = _read_upload_rgb(file_storage)

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp_path = tmp.name
    try:
        pil_oriented.save(tmp_path, quality=95)

        image = cv2.cvtColor(np.array(pil_oriented), cv2.COLOR_RGB2BGR)

        quality_before = {
            "blur_variance": blur_variance(image),
            "brightness": brightness_score(image),
            "is_blurry": is_blurry(tmp_path, threshold=config.BLUR_THRESHOLD),
            "is_low_light": is_low_light(image, threshold=config.LOW_LIGHT_THRESHOLD),
        }
        enhancements_applied: list[str] = []

        if quality_before["is_blurry"]:
            print("Image is blurry - enhancing with sharpen filter...")
            image = enhance_blurry_image(image)
            enhancements_applied.append("sharpening")

        if quality_before["is_low_light"]:
            print("Image is too dark - enhancing brightness/contrast...")
            image = enhance_low_light_image(image)
            enhancements_applied.append("brightness")

        quality_after = {
            "blur_variance": blur_variance(image),
            "brightness": brightness_score(image),
            "is_blurry": blur_variance(image) < config.BLUR_THRESHOLD,
            "is_low_light": is_low_light(image, threshold=config.LOW_LIGHT_THRESHOLD),
        }

        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")
        original_name = f"orig_{id_prefix}_{timestamp}{ext}"
        enhanced_name = f"enh_{id_prefix}_{timestamp}{ext}"

        orig_bgr = cv2.cvtColor(np.array(pil_oriented), cv2.COLOR_RGB2BGR)
        cv2.imwrite(os.path.join(config.UPLOAD_FOLDER, original_name), orig_bgr)
        cv2.imwrite(os.path.join(config.UPLOAD_FOLDER, enhanced_name), image)

        img_pil = Image.open(
            os.path.join(config.UPLOAD_FOLDER, enhanced_name)
        ).convert("RGB")
        return {
            "original_image_name": original_name,
            "enhanced_image_name": enhanced_name,
            "enhancements_applied": enhancements_applied,
            "quality_before": quality_before,
            "quality_after": quality_after,
            "quality_thresholds": {
                "blur_threshold": config.BLUR_THRESHOLD,
                "low_light_threshold": config.LOW_LIGHT_THRESHOLD,
            },
            "img_pil": img_pil,
        }
    finally:
        os.unlink(tmp_path)


def load_upload_as_pil_no_enhance(file_storage) -> Image.Image:
    """Read multipart upload as RGB PIL; no quality pipeline (gallery path).

    Matches notebook val_tf input: PIL.Image.open(...).convert('RGB') with EXIF
    + ICC->sRGB normalization (see _open_upload_pil).
    """
    return _read_upload_rgb(file_storage)
