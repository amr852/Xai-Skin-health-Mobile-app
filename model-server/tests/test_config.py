"""Unit tests for config — flat 7-class config, arch-switchable. No TF/YOLO import."""

import importlib
import os

import pytest

import config


def test_get_severity_urgent_mel():
    assert config.get_severity("MEL") == "urgent"


def test_get_severity_urgent_bcc():
    assert config.get_severity("BCC") == "urgent"


def test_get_severity_stable_nevus():
    assert config.get_severity("NV") == "stable"


def test_get_severity_check_ak():
    assert config.get_severity("AK") == "check"


def test_get_severity_unknown_defaults_check():
    assert config.get_severity("not_a_real_class") == "check"


def test_all_classes_count():
    assert config.NUM_CLASSES == 7
    assert len(config.ALL_CLASSES) == 7


def test_severity_covers_all_classes():
    for label in config.ALL_CLASSES:
        assert label in config.SEVERITY, f"missing severity for {label}"


def test_display_map_covers_all_classes():
    for label in config.ALL_CLASSES:
        assert config.get_display(label) != "", f"missing display for {label}"


def test_malignant_labels_subset_of_all():
    assert config.MALIGNANT_LABELS.issubset(set(config.ALL_CLASSES))


# Env vars that the arch-default mechanism reads. Cleared while snapshotting so
# ambient overrides (e.g. a dev shell with MODEL_ARCH=resnet50 set) don't leak
# into the assertions; ambient env AND module state are always restored.
_ARCH_ENV_VARS = ("MODEL_ARCH", "MODEL_WEIGHTS", "MODEL_NAME", "IMG_SIZE", "RESIZE_INTERPOLATION")
_SNAPSHOT_KEYS = ("MODEL_ARCH", "MODEL_NAME", "IMG_SIZE", "RESIZE_INTERPOLATION", "MODEL_WEIGHTS")


def _arch_snapshot(arch: str) -> dict:
    """Reload config with only MODEL_ARCH=arch set; return values; restore everything."""
    saved = {k: os.environ.pop(k, None) for k in _ARCH_ENV_VARS}
    try:
        os.environ["MODEL_ARCH"] = arch
        cfg = importlib.reload(config)
        return {k: getattr(cfg, k) for k in _SNAPSHOT_KEYS}
    finally:
        for k, val in saved.items():
            if val is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = val
        importlib.reload(config)  # module state back in sync with ambient env


def test_model_arch_switch_resnet50():
    snap = _arch_snapshot("resnet50")
    assert snap["MODEL_ARCH"] == "resnet50"
    assert snap["MODEL_NAME"] == "ResNet50"
    assert snap["IMG_SIZE"] == 224
    assert snap["RESIZE_INTERPOLATION"] == "BILINEAR"
    assert snap["MODEL_WEIGHTS"].endswith("best_resnet50.pth")


def test_model_arch_effnetb4_defaults():
    snap = _arch_snapshot("efficientnet_b4")
    assert snap["MODEL_ARCH"] == "efficientnet_b4"
    assert snap["MODEL_NAME"] == "EfficientNet-B4"
    assert snap["IMG_SIZE"] == 380
    assert snap["RESIZE_INTERPOLATION"] == "BICUBIC"
    assert snap["MODEL_WEIGHTS"].endswith("last_effnetb4.pth")


def test_model_arch_invalid_raises():
    with pytest.raises(ValueError):
        _arch_snapshot("vgg16")
    # _arch_snapshot's finally already restored env + module state.
    assert config.MODEL_ARCH in {"efficientnet_b4", "resnet50"}
