"""Fast unit tests — no torch / YOLO import."""

import config


def test_get_severity_urgent_melanoma():
    assert config.get_severity("melanoma") == "urgent"


def test_get_severity_stable_healthy():
    assert config.get_severity("healthy") == "stable"


def test_get_severity_unknown_defaults_check():
    assert config.get_severity("not a real class") == "check"


def test_num_classes_matches_class_names():
    assert config.NUM_CLASSES == len(config.CLASS_NAMES)
