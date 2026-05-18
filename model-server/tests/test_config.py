"""Fast unit tests — no torch / YOLO import."""

import config


def test_get_severity_urgent_melanoma():
    assert config.get_severity("melanoma") == "urgent"


def test_get_severity_urgent_bcc():
    assert config.get_severity("basal_cell_carcinoma") == "urgent"


def test_get_severity_stable_nevus():
    assert config.get_severity("nv") == "stable"


def test_get_severity_check_akiec():
    assert config.get_severity("akiec") == "check"


def test_get_severity_unknown_defaults_check():
    assert config.get_severity("not a real class") == "check"


def test_primary_classes_have_both_branches():
    lower = [c.lower() for c in config.PRIMARY_CLASSES]
    assert "benign" in lower and "malignant" in lower


def test_severity_covers_every_specialist_label():
    for label in (*config.BENIGN_CLASSES, *config.MALIGNANT_CLASSES):
        assert label in config.SEVERITY, f"missing severity for {label}"


def test_display_map_covers_specialist_labels():
    for label in (*config.BENIGN_CLASSES, *config.MALIGNANT_CLASSES):
        assert config.get_display(label) != "", f"missing display for {label}"
