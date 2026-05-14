from services.bbox_dedupe import dedupe_nested_boxes


def box(x1, y1, x2, y2, conf=0.9):
    return {"x1": x1, "y1": y1, "x2": x2, "y2": y2, "conf": conf}


def test_keeps_separate_lesions_instead_of_giant_whole_image_container():
    full_frame = {"id": "full", **box(0, 0, 1000, 800, 0.95)}
    lesion_a = {"id": "a", **box(120, 140, 230, 260, 0.81)}
    lesion_b = {"id": "b", **box(650, 390, 760, 520, 0.78)}

    result = dedupe_nested_boxes([full_frame, lesion_b, lesion_a])

    assert [item["id"] for item in result] == ["a", "b"]


def test_overlapping_duplicate_children_do_not_make_outer_an_aggregate():
    outer = {"id": "outer", **box(0, 0, 200, 200, 0.9)}
    duplicate_a = {"id": "a", **box(80, 80, 100, 100, 0.8)}
    duplicate_b = {"id": "b", **box(81, 81, 101, 101, 0.78)}

    result = dedupe_nested_boxes([outer, duplicate_b, duplicate_a])

    assert [item["id"] for item in result] == ["outer"]
