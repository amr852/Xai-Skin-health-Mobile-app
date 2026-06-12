"""/scan-multi healthy gate: detector 'Healthy' boxes must never be classified.

The YOLO head emits two classes ('Healthy', 'lesion'). A Healthy box reaching
the 7-class HAM10000 classifier would be forced into a lesion label, so the
route must drop Healthy boxes and return the healthy response when nothing
lesion-class remains.
"""

from __future__ import annotations

import io

import cv2
import numpy as np
import pytest

try:
    from app import app as flask_app
    from services import detector as detector_mod
    from services import classifier as classifier_mod
    from services import explainer as explainer_mod
except Exception as exc:  # pragma: no cover - env without weights
    flask_app = None
    _import_error = exc
else:
    _import_error = None


pytestmark = pytest.mark.skipif(
    flask_app is None,
    reason=f"Flask app could not boot (likely missing weights): {_import_error!r}",
)


def _jpg_bytes(side: int = 320) -> bytes:
    img = np.full((side, side, 3), 200, dtype=np.uint8)
    ok, buf = cv2.imencode(".jpg", img)
    assert ok
    return bytes(buf)


FAKE_DIAG = {
    "primary": {"label": "benign", "display": "Benign", "score": 0.91},
    "specialist": {
        "label": "NV",
        "display": "Melanocytic nevus",
        "score": 0.91,
        "top_k": [{"label": "NV", "score": 0.91}],
    },
    "specialist_pred_idx": 5,
    "uncertainty": None,
}


@pytest.fixture()
def client(monkeypatch):
    # No real inference: classifier + explainer stubbed so the test exercises
    # only the routing/gating logic.
    monkeypatch.setattr(
        classifier_mod.lesion_classifier, "predict", lambda *_a, **_kw: dict(FAKE_DIAG)
    )
    monkeypatch.setattr(
        explainer_mod.gradcam_explainer,
        "overlay_for_lesion",
        lambda *_a, **_kw: None,
    )
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as c:
        yield c


def _post_scan(client) -> dict:
    res = client.post(
        "/scan-multi",
        data={"image": (io.BytesIO(_jpg_bytes()), "scan.jpg"), "source": "gallery"},
        content_type="multipart/form-data",
    )
    assert res.status_code == 200
    return res.get_json()


def test_healthy_only_boxes_return_healthy_response(client, monkeypatch):
    monkeypatch.setattr(
        detector_mod.lesion_detector,
        "detect",
        lambda *_a, **_kw: [
            {"x1": 10, "y1": 10, "x2": 120, "y2": 120, "conf": 0.92, "cls": "Healthy"},
            {"x1": 150, "y1": 150, "x2": 260, "y2": 260, "conf": 0.74, "cls": "Healthy"},
        ],
    )
    body = _post_scan(client)
    assert body["healthy"] is True
    assert body["no_lesion_found"] is True
    assert body["lesion_count"] == 0
    assert body["lesions"] == []
    assert body["whole_image"] is None


def test_mixed_boxes_keep_only_lesion_class(client, monkeypatch):
    monkeypatch.setattr(
        detector_mod.lesion_detector,
        "detect",
        lambda *_a, **_kw: [
            {"x1": 10, "y1": 10, "x2": 120, "y2": 120, "conf": 0.92, "cls": "Healthy"},
            {"x1": 150, "y1": 150, "x2": 260, "y2": 260, "conf": 0.88, "cls": "lesion"},
        ],
    )
    body = _post_scan(client)
    assert body["healthy"] is False
    assert body["lesion_count"] == 1
    assert len(body["lesions"]) == 1
    # The surviving box is the lesion-class one.
    assert body["lesions"][0]["bbox"]["conf"] == pytest.approx(0.88)


def test_no_boxes_still_healthy(client, monkeypatch):
    monkeypatch.setattr(
        detector_mod.lesion_detector, "detect", lambda *_a, **_kw: []
    )
    body = _post_scan(client)
    assert body["healthy"] is True
    assert body["lesion_count"] == 0
