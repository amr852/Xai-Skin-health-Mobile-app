import type { LesionBbox } from '@/lib/bboxLayout';

/** True if inner is fully inside outer (edges may coincide). */
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

/**
 * Drops detections whose box is fully contained in another box (keeps the outer).
 * After filtering, sorts by top-to-bottom, then left-to-right for stable Lesion 1..N labels.
 */
export function dedupeNestedDetections<T extends { bbox: LesionBbox }>(items: T[]): T[] {
  if (items.length <= 1) return [...items];

  const indexed = items.map((item, idx) => ({ item, idx }));
  indexed.sort((a, b) => {
    const da = bboxArea(a.item.bbox);
    const db = bboxArea(b.item.bbox);
    if (db !== da) return db - da;
    if (b.item.bbox.conf !== a.item.bbox.conf) return b.item.bbox.conf - a.item.bbox.conf;
    return a.idx - b.idx;
  });

  const kept: T[] = [];
  for (const { item } of indexed) {
    const redundant = kept.some((k) => bboxContains(k.bbox, item.bbox));
    if (!redundant) kept.push(item);
  }

  kept.sort((a, b) => {
    const dy = a.bbox.y1 - b.bbox.y1;
    if (Math.abs(dy) > 1) return dy;
    return a.bbox.x1 - b.bbox.x1;
  });
  return kept;
}
