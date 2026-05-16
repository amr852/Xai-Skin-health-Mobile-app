"""Smoke test for the Live-mode detector-only endpoint.

Boots the Flask app, monkeypatches the YOLO detector to return synthetic boxes
(no real inference), and asserts response schema + that aggregate-container
dedupe runs on the detector output before serialization.
"""

from __future__ import annotations

import io

import cv2
import numpy as np
import pytest

try:
    from app import app as flask_app
    from services import detector as detector_mod
except Exception as exc:  # pragma: no cover - env without weights
    flask_app = None
    _import_error = exc
else:
    _import_error = None


pytestmark = pytest.mark.skipif(
    flask_app is None,
    reason=f"Flask app could not boot (likely missing weights): {_import_error!r}",
)


def _png_bytes(side: int = 320) -> bytes:
    img = np.full((side, side, 3), 220, dtype=np.uint8)
    ok, buf = cv2.imencode(".jpg", img)
    assert ok
    return bytes(buf)


@pytest.fixture()
def client(monkeypatch):
    # Synthetic detector output: one giant aggregate container + two small
    # lesions inside it. dedupe should drop the aggregate before we serialize.
    fake_boxes = [
        {"x1": 0, "y1": 0, "x2": 320, "y2": 320, "conf": 0.95, "cls": "lesion"},
        {"x1": 30, "y1": 40, "x2": 80, "y2": 90, "conf": 0.81, "cls": "lesion"},
        {"x1": 200, "y1": 210, "x2": 260, "y2": 280, "conf": 0.78, "cls": "lesion"},
    ]
    monkeypatch.setattr(
        detector_mod.lesion_detector, "detect", lambda *_a, **_kw: list(fake_boxes)
    )
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as c:
        yield c


def test_detect_fast_rejects_missing_image(client):
    res = client.post("/detect-fast")
    assert res.status_code == 400


def test_detect_fast_returns_normalized_boxes_with_dedupe(client):
    data = {"image": (io.BytesIO(_png_bytes(320)), "frame.jpg")}
    res = client.post("/detect-fast", data=data, content_type="multipart/form-data")
    assert res.status_code == 200
    body = res.get_json()
    assert set(body.keys()) >= {"boxes", "width", "height", "ms"}
    assert body["width"] == 320 and body["height"] == 320
    # Aggregate dropped → only the two small lesions survive.
    assert len(body["boxes"]) == 2
    for box in body["boxes"]:
        assert set(box.keys()) >= {"x", "y", "w", "h", "cls", "conf"}
        # Coords normalized 0..1.
        assert 0.0 <= box["x"] <= 1.0
        assert 0.0 <= box["y"] <= 1.0
        assert 0.0 < box["w"] <= 1.0
        assert 0.0 < box["h"] <= 1.0


def test_detect_fast_rejects_oversized_frame(client):
    big = _png_bytes(1024)
    res = client.post(
        "/detect-fast",
        data={"image": (io.BytesIO(big), "big.jpg")},
        content_type="multipart/form-data",
    )
    assert res.status_code == 413
