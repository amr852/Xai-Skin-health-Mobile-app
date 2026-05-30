"""Smoke tests for the flat ResNet50 classifier.

Skips if the weight file is not on disk.
"""

from __future__ import annotations

import os

import pytest

import config

_WEIGHTS_PRESENT = os.path.exists(config.RESNET50_WEIGHTS)

pytestmark = pytest.mark.skipif(
    not _WEIGHTS_PRESENT,
    reason="ResNet50 weight file not present on disk",
)


@pytest.fixture(scope="module")
def classifier():
    from services.classifier import lesion_classifier
    return lesion_classifier


def _gray_pil():
    from PIL import Image
    return Image.new("RGB", (config.IMG_SIZE, config.IMG_SIZE), (128, 128, 128))


def test_predict_shape(classifier):
    out = classifier.predict(_gray_pil())
    assert "primary" in out and "specialist" in out
    assert "specialist_model_key" in out
    assert out["specialist_model_key"] == "resnet50"
    assert isinstance(out["primary"]["score"], float)
    assert isinstance(out["specialist"]["score"], float)
    assert 0.0 <= out["primary"]["score"] <= 1.0
    assert 0.0 <= out["specialist"]["score"] <= 1.0


def test_predict_returns_valid_label(classifier):
    out = classifier.predict(_gray_pil())
    assert out["specialist"]["label"] in config.ALL_CLASSES


def test_predict_top_k(classifier):
    out = classifier.predict(_gray_pil())
    top_k = out["specialist"]["top_k"]
    assert isinstance(top_k, list)
    assert len(top_k) >= 1
    for entry in top_k:
        assert "label" in entry
        assert "score" in entry
        assert entry["label"] in config.ALL_CLASSES


def test_predict_dual_uses_full_image(classifier):
    """predict_dual should just classify the full image."""
    from PIL import Image
    crop = Image.new("RGB", (100, 100), (200, 100, 50))
    full = Image.new("RGB", (224, 224), (50, 100, 200))
    out = classifier.predict_dual(crop, full)
    assert out["specialist"]["label"] in config.ALL_CLASSES


def test_gradcam_produces_output(classifier):
    from services.explainer import gradcam_explainer
    img = _gray_pil()
    result = classifier.predict(img)
    cam_b64 = gradcam_explainer.overlay_for_lesion(img, result, tag="test")
    assert cam_b64 is not None
    assert len(cam_b64) > 100
