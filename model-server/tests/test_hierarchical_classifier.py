"""Shape and output tests for FlatClassifier (EfficientNet-B4).

Skips entirely if the .pth weight file is missing.
"""

from __future__ import annotations

import os

import pytest

import config

_WEIGHTS_PRESENT = os.path.exists(config.MODEL_WEIGHTS)

pytestmark = pytest.mark.skipif(
    not _WEIGHTS_PRESENT,
    reason="Classifier weight file not present on disk",
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
    assert "label" in out
    assert "score" in out
    assert "specialist" in out
    assert "primary" in out
    assert "specialist_model_key" in out
    assert out["specialist_model_key"] == "flat"
    assert isinstance(out["score"], float)
    assert 0.0 <= out["score"] <= 1.0


def test_predict_label_in_known_classes(classifier):
    out = classifier.predict(_gray_pil())
    assert out["label"] in config.ALL_CLASSES
    assert out["specialist"]["label"] in config.ALL_CLASSES


def test_predict_top_k_structure(classifier):
    out = classifier.predict(_gray_pil())
    top_k = out["top_k"]
    assert isinstance(top_k, list) and len(top_k) >= 1
    for entry in top_k:
        assert "label" in entry and "score" in entry and "display" in entry
        assert entry["label"] in config.ALL_CLASSES
    # top result score should be >= rest
    assert top_k[0]["score"] == max(e["score"] for e in top_k)


def test_predict_primary_derived(classifier):
    out = classifier.predict(_gray_pil())
    primary = out["primary"]
    assert primary["label"] in {"benign", "malignant"}
    # derivation must be consistent with the flat label
    if out["label"] in config.MALIGNANT_LABELS:
        assert primary["label"] == "malignant"
    else:
        assert primary["label"] == "benign"


def test_predict_uncertainty_keys(classifier):
    out = classifier.predict(_gray_pil())
    u = out["uncertainty"]
    assert "low_confidence" in u
    assert isinstance(u["low_confidence"], bool)


def test_gradcam_produces_output(classifier):
    from services.explainer import gradcam_explainer
    img = _gray_pil()
    result = classifier.predict(img)
    cam_b64 = gradcam_explainer.overlay_for_lesion(img, result, tag="test")
    assert cam_b64 is not None
    assert len(cam_b64) > 100
