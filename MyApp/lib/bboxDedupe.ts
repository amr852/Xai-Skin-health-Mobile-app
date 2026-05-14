import type { LesionBbox } from '@/lib/bboxLayout';

/**
 * Containment ratio threshold. If at least this fraction of the inner box's
 * area lies inside the outer box, the inner is treated as redundant. Tuned
 * for detector imprecision (1–3 px wobble on edges) — strict containment
 * was leaving inner boxes when they poked out by a few pixels.
 */
const SOFT_CONTAINMENT_THRESHOLD = 0.85;
const AGGREGATE_CONTAINER_MIN_CHILDREN = 2;
const AGGREGATE_CONTAINER_MAX_CHILD_AREA_RATIO = 0.4;
const DISTINCT_CHILD_OVERLAP_THRESHOLD = 0.85;

/** True iff `inner` lies fully inside `outer` (edges may coincide). */
export function bboxContains(outer: LesionBbox, inner: LesionBbox): boolean {
  return (
    inner.x1 >= outer.x1 &&
    inner.y1 >= outer.y1 &&
    inner.x2 <= outer.x2 &&
    inner.y2 <= outer.y2
  );
}

export function bboxArea(b: LesionBbox): number {
  return Math.max(0, b.x2 - b.x1) * Math.max(0, b.y2 - b.y1);
}

function intersectionArea(a: LesionBbox, b: LesionBbox): number {
  const w = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1));
  const h = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  return w * h;
}

function smallerBoxOverlapRatio(a: LesionBbox, b: LesionBbox): number {
  const smallerArea = Math.min(bboxArea(a), bboxArea(b));
  if (smallerArea <= 0) return 0;
  return intersectionArea(a, b) / smallerArea;
}

/**
 * Returns true when at least `threshold` (default 0.85) of `inner`'s area
 * falls inside `outer`. This is "soft contains": more permissive than strict
 * containment so detector noise on the edges doesn't keep a duplicate box.
 */
export function bboxSoftContains(
  outer: LesionBbox,
  inner: LesionBbox,
  threshold: number = SOFT_CONTAINMENT_THRESHOLD,
): boolean {
  const innerArea = bboxArea(inner);
  if (innerArea <= 0) return false;
  return intersectionArea(outer, inner) / innerArea >= threshold;
}

function isAggregateContainer(candidate: LesionBbox, boxes: LesionBbox[]): boolean {
  const candidateArea = bboxArea(candidate);
  if (candidateArea <= 0) return false;

  const containedBoxes = boxes.filter(
    (other) => other !== candidate && bboxSoftContains(candidate, other),
  );
  const distinctContainedBoxes = containedBoxes.reduce<LesionBbox[]>((distinct, box) => {
    const duplicatesExisting = distinct.some(
      (existing) => smallerBoxOverlapRatio(existing, box) >= DISTINCT_CHILD_OVERLAP_THRESHOLD,
    );
    if (!duplicatesExisting) distinct.push(box);
    return distinct;
  }, []);
  if (distinctContainedBoxes.length < AGGREGATE_CONTAINER_MIN_CHILDREN) return false;

  const containedArea = distinctContainedBoxes.reduce((sum, b) => sum + bboxArea(b), 0);
  return containedArea / candidateArea <= AGGREGATE_CONTAINER_MAX_CHILD_AREA_RATIO;
}

/**
 * Drops giant aggregate containers first, then drops detections whose box is
 * (softly) contained in another box, keeping the larger lesion box. After
 * filtering, sorts by top-to-bottom then left-to-right for stable Lesion 1..N
 * labels.
 *
 * "Soft containment" lets imprecise nested boxes (small box mostly but not
 * exactly inside a bigger one) collapse into the outer, which matches the
 * dermatology-review intent: one diagnosis per visible lesion area.
 */
export function dedupeNestedDetections<T extends { bbox: LesionBbox }>(items: T[]): T[] {
  if (items.length <= 1) return [...items];

  const allBoxes = items.map((item) => item.bbox);
  const indexed = items
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => !isAggregateContainer(item.bbox, allBoxes));
  indexed.sort((a, b) => {
    const da = bboxArea(a.item.bbox);
    const db = bboxArea(b.item.bbox);
    if (db !== da) return db - da;
    if (b.item.bbox.conf !== a.item.bbox.conf) return b.item.bbox.conf - a.item.bbox.conf;
    return a.idx - b.idx;
  });

  const kept: T[] = [];
  for (const { item } of indexed) {
    const redundant = kept.some((k) => bboxSoftContains(k.bbox, item.bbox));
    if (!redundant) kept.push(item);
  }

  kept.sort((a, b) => {
    const dy = a.bbox.y1 - b.bbox.y1;
    if (Math.abs(dy) > 1) return dy;
    return a.bbox.x1 - b.bbox.x1;
  });
  return kept;
}
