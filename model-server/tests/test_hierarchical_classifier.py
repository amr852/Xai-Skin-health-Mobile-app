"""Routing tests for HierarchicalClassifier.

Skips entirely if the EfficientNet weights are not on disk — the classifier
loads three .pth files at import time, so without them no smoke test is
possible. When weights exist, this asserts:

  - primary == 'malignant' routes to the malignant specialist
  - primary == 'benign'    routes to the benign specialist
  - response shape carries `primary`, `specialist`, `specialist_model_key`
"""

from __future__ import annotations

import os

import pytest

import config

_WEIGHTS_PRESENT = all(
    os.path.exists(p)
    for p in (config.PRIMARY_WEIGHTS, config.BENIGN_WEIGHTS, config.MALIGNANT_WEIGHTS)
)

pytestmark = pytest.mark.skipif(
    not _WEIGHTS_PRESENT,
    reason="EfficientNet weight files not present on disk",
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
    assert out["specialist_model_key"] in {"benign", "malignant"}
    assert isinstance(out["primary"]["score"], float)
    assert isinstance(out["specialist"]["score"], float)
    assert 0.0 <= out["primary"]["score"] <= 1.0
    assert 0.0 <= out["specialist"]["score"] <= 1.0


def test_routing_consistency(classifier, monkeypatch):
    """Force primary to malignant; specialist must be malignant head."""
    import torch

    real_forward = classifier._forward
    state = {"calls": 0}

    def fake_forward(net, tensor):
        state["calls"] += 1
        if state["calls"] == 1:
            # primary head — force malignant by skewing logits.
            mal_idx = next(
                i for i, c in enumerate(classifier.primary_labels)
                if c.lower() == "malignant"
            )
            logits = torch.full((1, len(classifier.primary_labels)), -10.0)
            logits[0, mal_idx] = 10.0
            return logits
        return real_forward(net, tensor)

    monkeypatch.setattr(classifier, "_forward", fake_forward)
    out = classifier.predict(_gray_pil())
    assert out["specialist_model_key"] == "malignant"
    assert out["specialist"]["label"] in classifier.malignant_labels


def test_routing_benign_branch(classifier, monkeypatch):
    """Force primary to benign; specialist must be benign head (pure primary gate, no override)."""
    import torch

    ben_primary_idx = next(
        i for i, c in enumerate(classifier.primary_labels) if c.lower() == "benign"
    )

    def fake_forward(net, tensor):
        if net is classifier.primary:
            logits = torch.full((1, len(classifier.primary_labels)), -10.0)
            logits[0, ben_primary_idx] = 10.0
            return logits
        if net is classifier.benign:
            logits = torch.full((1, len(classifier.benign_labels)), 0.0)
            logits[0, 0] = 5.0
            return logits
        # Malignant head should not be called under pure primary-gate routing.
        raise AssertionError("malignant specialist invoked when primary said benign")

    monkeypatch.setattr(classifier, "_forward", fake_forward)
    out = classifier.predict(_gray_pil())
    assert out["specialist_model_key"] == "benign"
    assert out["specialist"]["label"] in classifier.benign_labels
    assert out["primary"]["label"].lower() == "benign"
