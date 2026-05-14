import type { LesionBbox } from '@/lib/bboxLayout';
import { bboxContains, bboxSoftContains, dedupeNestedDetections } from '@/lib/bboxDedupe';

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

describe('bboxSoftContains', () => {
  it('is true when the inner is fully inside the outer', () => {
    expect(bboxSoftContains(box(0, 0, 200, 200), box(10, 10, 50, 50))).toBe(true);
  });

  it('is true when only a few pixels poke outside the outer', () => {
    // Inner 100x100 sticks out by 2px on each axis; ~96% of its area is inside.
    expect(bboxSoftContains(box(0, 0, 98, 98), box(0, 0, 100, 100))).toBe(true);
  });

  it('is false when boxes only mildly overlap', () => {
    // 50x50 overlap region inside a 100x100 inner = 25% — well below threshold.
    expect(bboxSoftContains(box(0, 0, 100, 100), box(50, 50, 150, 150))).toBe(false);
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

  it('removes inner box that is mostly (but not strictly) inside outer', () => {
    // Mirrors the screenshot bug: small detection sits inside a much larger
    // one but its right edge pokes 5px past the outer's right edge.
    const outer = { id: 'o', bbox: box(0, 0, 200, 200) };
    const innerPokesOut = { id: 'i', bbox: box(150, 150, 205, 195) };
    const r = dedupeNestedDetections([outer, innerPokesOut]);
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('o');
  });

  it('keeps separate lesions instead of a giant whole-image container', () => {
    const fullFrame = { id: 'full', bbox: box(0, 0, 1000, 800, 0.95) };
    const lesionA = { id: 'a', bbox: box(120, 140, 230, 260, 0.81) };
    const lesionB = { id: 'b', bbox: box(650, 390, 760, 520, 0.78) };

    const r = dedupeNestedDetections([fullFrame, lesionB, lesionA]);

    expect(r.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('does not treat overlapping duplicate children as separate lesions', () => {
    const outer = { id: 'outer', bbox: box(0, 0, 200, 200, 0.9) };
    const duplicateA = { id: 'a', bbox: box(80, 80, 100, 100, 0.8) };
    const duplicateB = { id: 'b', bbox: box(81, 81, 101, 101, 0.78) };

    const r = dedupeNestedDetections([outer, duplicateB, duplicateA]);

    expect(r.map((item) => item.id)).toEqual(['outer']);
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
