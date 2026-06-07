"""Image preprocessing for the flat ResNet50 PyTorch classifier.

Matches the training notebook pipeline (byte-for-byte the EfficientNet-B4
pipeline besides resolution):
  Resize(IMG_SIZE, BILINEAR) → ToTensor ([0,1]) → Normalize(ImageNet mean/std)

PIL + EXIF + ICC->sRGB handling ensures phone JPEGs are colour-correct.
"""

from __future__ import annotations

import io

import numpy as np
from PIL import Image, ImageCms, ImageOps

import config

_SRGB_PROFILE = ImageCms.createProfile("sRGB")

# Pre-converted to (3,1,1) for broadcast over (3,H,W) tensors.
_MEAN = np.array(config.IMAGENET_MEAN, dtype=np.float32).reshape(3, 1, 1)
_STD  = np.array(config.IMAGENET_STD,  dtype=np.float32).reshape(3, 1, 1)


def open_rgb_pil(raw_bytes: bytes) -> Image.Image:
    """Decode bytes → RGB PIL with EXIF orientation + ICC→sRGB conversion."""
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


def pil_to_tensor(pil_image: Image.Image):
    """PIL RGB → (1, 3, IMG_SIZE, IMG_SIZE) float32 torch.Tensor.

    Matches torchvision ToTensor + Normalize(ImageNet mean, std).
    """
    import torch
    interp = getattr(Image, config.RESIZE_INTERPOLATION, Image.BILINEAR)
    rgb = pil_image.convert("RGB").resize(
        (config.IMG_SIZE, config.IMG_SIZE), interp
    )
    arr = np.array(rgb, dtype=np.float32) / 255.0   # HWC [0,1]
    arr = arr.transpose(2, 0, 1)                     # CHW
    arr = (arr - _MEAN) / _STD                       # ImageNet normalise
    return torch.from_numpy(arr).unsqueeze(0)        # (1,3,H,W)


def flip_tensor(t, dim: int):
    """Flip a (1,C,H,W) tensor along H(2) or W(3)."""
    import torch
    return torch.flip(t, [dim]).contiguous()
