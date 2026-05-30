"""Lesion-aware crop extraction with padding (YOLO bbox or center fallback)."""

from __future__ import annotations

from PIL import Image

import config


def padded_bbox_crop(
    pil_image: Image.Image,
    x1: int,
    y1: int,
    x2: int,
    y2: int,
    padding_ratio: float | None = None,
) -> Image.Image:
    """Crop lesion region with symmetric margin; preserve aspect ratio in source space."""
    pad = padding_ratio if padding_ratio is not None else config.LESION_CROP_PADDING
    w, h = pil_image.size
    bw = max(1, x2 - x1)
    bh = max(1, y2 - y1)
    mx = int(bw * pad)
    my = int(bh * pad)
    cx1 = max(0, x1 - mx)
    cy1 = max(0, y1 - my)
    cx2 = min(w, x2 + mx)
    cy2 = min(h, y2 + my)
    if cx2 <= cx1 or cy2 <= cy1:
        return pil_image.copy()
    return pil_image.crop((cx1, cy1, cx2, cy2))


def center_fallback_crop(pil_image: Image.Image, fraction: float = 0.85) -> Image.Image:
    """Center square crop when detector misses — common for dermoscopy fills frame."""
    w, h = pil_image.size
    side = int(min(w, h) * fraction)
    if side < 8:
        return pil_image.copy()
    cx, cy = w // 2, h // 2
    half = side // 2
    x1 = max(0, cx - half)
    y1 = max(0, cy - half)
    x2 = min(w, x1 + side)
    y2 = min(h, y1 + side)
    return pil_image.crop((x1, y1, x2, y2))
