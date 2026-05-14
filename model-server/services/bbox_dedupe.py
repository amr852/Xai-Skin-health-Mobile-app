"""Remove aggregate and nested detector boxes before classification.

Uses *soft containment*: a box is dropped when at least
``SOFT_CONTAINMENT_THRESHOLD`` of its own area lies inside another box.
Strict containment (``inner ⊆ outer``) was missing duplicates where the
detector wobbled by a few pixels on the edges, leaving an inner box that
visibly nested inside a bigger outer one.
"""

from __future__ import annotations


SOFT_CONTAINMENT_THRESHOLD = 0.85
AGGREGATE_CONTAINER_MIN_CHILDREN = 2
AGGREGATE_CONTAINER_MAX_CHILD_AREA_RATIO = 0.4
DISTINCT_CHILD_OVERLAP_THRESHOLD = 0.85


def _area(box: dict) -> float:
    w = max(0, int(box["x2"]) - int(box["x1"]))
    h = max(0, int(box["y2"]) - int(box["y1"]))
    return float(w * h)


def _intersect_area(a: dict, b: dict) -> float:
    iw = max(0, min(int(a["x2"]), int(b["x2"])) - max(int(a["x1"]), int(b["x1"])))
    ih = max(0, min(int(a["y2"]), int(b["y2"])) - max(int(a["y1"]), int(b["y1"])))
    return float(iw * ih)


def _smaller_box_overlap_ratio(a: dict, b: dict) -> float:
    smaller_area = min(_area(a), _area(b))
    if smaller_area <= 0:
        return 0.0
    return _intersect_area(a, b) / smaller_area


def _soft_contains(outer: dict, inner: dict, threshold: float = SOFT_CONTAINMENT_THRESHOLD) -> bool:
    """True when at least ``threshold`` of ``inner``'s area lies inside ``outer``."""
    inner_area = _area(inner)
    if inner_area <= 0:
        return False
    return _intersect_area(outer, inner) / inner_area >= threshold


def _is_aggregate_container(candidate: dict, boxes: list[dict]) -> bool:
    candidate_area = _area(candidate)
    if candidate_area <= 0:
        return False

    contained = [box for box in boxes if box is not candidate and _soft_contains(candidate, box)]
    distinct_contained: list[dict] = []
    for box in contained:
        duplicates_existing = any(
            _smaller_box_overlap_ratio(existing, box) >= DISTINCT_CHILD_OVERLAP_THRESHOLD
            for existing in distinct_contained
        )
        if not duplicates_existing:
            distinct_contained.append(box)

    if len(distinct_contained) < AGGREGATE_CONTAINER_MIN_CHILDREN:
        return False

    contained_area = sum(_area(box) for box in distinct_contained)
    return contained_area / candidate_area <= AGGREGATE_CONTAINER_MAX_CHILD_AREA_RATIO


def dedupe_nested_boxes(boxes: list[dict]) -> list[dict]:
    """
    Drop giant aggregate containers, then boxes substantially contained in
    another box. Sorts survivors top-to-bottom, left-to-right for stable
    ordering.
    """
    if len(boxes) <= 1:
        return list(boxes)

    boxes = [box for box in boxes if not _is_aggregate_container(box, boxes)]
    sorted_boxes = sorted(
        boxes,
        key=lambda b: (_area(b), float(b.get("conf", 0))),
        reverse=True,
    )
    kept: list[dict] = []
    for box in sorted_boxes:
        if any(_soft_contains(k, box) for k in kept):
            continue
        kept.append(box)

    kept.sort(key=lambda b: (int(b["y1"]), int(b["x1"])))
    return kept
