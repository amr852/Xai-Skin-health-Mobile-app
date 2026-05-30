"""Unit tests for config — 7-class MobileNetV2 HAM10000 config. No TF/YOLO import."""

import config


def test_get_severity_urgent_mel():
    assert config.get_severity("mel") == "urgent"


def test_get_severity_urgent_bcc():
    assert config.get_severity("bcc") == "urgent"


def test_get_severity_stable_nevus():
    assert config.get_severity("nv") == "stable"


def test_get_severity_check_akiec():
    assert config.get_severity("akiec") == "check"


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
