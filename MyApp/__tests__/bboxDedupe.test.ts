import type { LesionBbox } from '@/lib/bboxLayout';
import { bboxContains, dedupeNestedDetections } from '@/lib/bboxDedupe';

function box(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  conf = 0.9,
): LesionBbox {
  return { x1, y1, x2, y2, conf };
}

describe('bboxContains', () => {
  it('is true when inner is strictly inside', () => {
    expect(bboxContains(box(0, 0, 100, 100), box(10, 10, 90, 90))).toBe(true);
  });

  it('is true when inner shares edges with outer', () => {
    expect(bboxContains(box(0, 0, 100, 100), box(0, 0, 50, 50))).toBe(true);
  });

  it('is false when inner extends past outer', () => {
    expect(bboxContains(box(0, 0, 100, 100), box(0, 0, 101, 50))).toBe(false);
  });
});

describe('dedupeNestedDetections', () => {
  it('removes inner box when nested in outer', () => {
    const outer = { id: 'o', bbox: box(0, 0, 200, 200) };
    const inner = { id: 'i', bbox: box(50, 50, 150, 150) };
    const r = dedupeNestedDetections([inner, outer]);
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('o');
  });

  it('keeps both when boxes only overlap', () => {
    const a = { bbox: box(0, 0, 100, 100) };
    const b = { bbox: box(50, 50, 150, 150) };
    expect(dedupeNestedDetections([a, b])).toHaveLength(2);
  });

  it('keeps one of two identical boxes', () => {
    const a = { k: 1, bbox: box(10, 10, 40, 40, 0.8) };
    const b = { k: 2, bbox: box(10, 10, 40, 40, 0.9) };
    const r = dedupeNestedDetections([a, b]);
    expect(r).toHaveLength(1);
    expect(r[0].k).toBe(2);
  });
});
