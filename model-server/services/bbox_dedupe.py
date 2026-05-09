"""Remove nested detector boxes (keep outer) before classification."""

from __future__ import annotations


def _area(box: dict) -> float:
    w = max(0, int(box["x2"]) - int(box["x1"]))
    h = max(0, int(box["y2"]) - int(box["y1"]))
    return float(w * h)


def _contains(outer: dict, inner: dict) -> bool:
    return (
        inner["x1"] >= outer["x1"]
        and inner["y1"] >= outer["y1"]
        and inner["x2"] <= outer["x2"]
        and inner["y2"] <= outer["y2"]
    )


def dedupe_nested_boxes(boxes: list[dict]) -> list[dict]:
    """
    Drop boxes fully contained in another box (outer kept). Sorts survivors
    top-to-bottom, left-to-right for stable ordering.
    """
    if len(boxes) <= 1:
        return list(boxes)

    sorted_boxes = sorted(
        boxes,
        key=lambda b: (_area(b), float(b.get("conf", 0))),
        reverse=True,
    )
    kept: list[dict] = []
    for box in sorted_boxes:
        if any(_contains(k, box) for k in kept):
            continue
        kept.append(box)

    kept.sort(key=lambda b: (int(b["y1"]), int(b["x1"])))
    return kept
