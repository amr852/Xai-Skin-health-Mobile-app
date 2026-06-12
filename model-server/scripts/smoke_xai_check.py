"""Smoke check: POST a real photo to /scan-multi and report XAI overlay presence.

Run from model-server/:  python scripts/smoke_xai_check.py [image_path]
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app  # noqa: E402
from services.detector import lesion_detector  # noqa: E402
import cv2  # noqa: E402

img_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "uploads", "orig_anon_20260610234432671228.jpg",
)

# Raw detector pass — show class labels the YOLO head emits on this image.
bgr = cv2.imread(img_path)
boxes = lesion_detector.detect(bgr)
print("detector boxes:", [(b["cls"], round(b["conf"], 3)) for b in boxes])

client = app.test_client()
with open(img_path, "rb") as f:
    resp = client.post(
        "/scan-multi",
        data={"image": (f, "lesion.jpg"), "source": "gallery"},
        content_type="multipart/form-data",
    )

print("status:", resp.status_code)
j = resp.get_json()
print("lesion_count:", j.get("lesion_count"), "healthy:", j.get("healthy"))
for i, L in enumerate(j.get("lesions") or []):
    print(
        f"lesion[{i}]: label={L['specialist']['label']}"
        f" crop_b64={'yes' if L.get('crop_b64') else 'NO'}"
        f" overlay_b64={'yes' if L.get('overlay_b64') else 'NO'}"
    )
wi = j.get("whole_image")
print("whole_image:", "none" if not wi else f"overlay_b64={'yes' if wi.get('overlay_b64') else 'NO'} label={wi['specialist']['label']}")
