import {
  containLayout,
  bboxToOverlayRect,
  reticleCropInPhotoPx,
  type LesionBbox,
} from '@/lib/bboxLayout';

describe('containLayout', () => {
  it('scales image to fit container', () => {
    const L = containLayout(200, 100, 400, 200);
    expect(L.scale).toBe(0.5);
    expect(L.drawW).toBe(200);
    expect(L.drawH).toBe(100);
    expect(L.offsetX).toBe(0);
    expect(L.offsetY).toBe(0);
  });

  it('returns safe defaults for zero dimensions', () => {
    const L = containLayout(0, 100, 400, 200);
    expect(L.scale).toBe(1);
    expect(L.drawW).toBe(0);
    expect(L.drawH).toBe(100);
  });
});

describe('bboxToOverlayRect', () => {
  it('maps bbox through layout scale and offset', () => {
    const bbox: LesionBbox = { x1: 0, y1: 0, x2: 100, y2: 50, conf: 0.9 };
    const layout = { scale: 0.5, offsetX: 10, offsetY: 20, drawW: 50, drawH: 25 };
    const r = bboxToOverlayRect(bbox, layout);
    expect(r.left).toBe(10);
    expect(r.top).toBe(20);
    expect(r.width).toBe(50);
    expect(r.height).toBe(25);
  });
});

describe('reticleCropInPhotoPx', () => {
  it('maps a centered reticle to a centered crop in portrait photo space', () => {
    // 393×852 layout, 3024×4032 photo (portrait-oriented), 220px reticle
    const c = reticleCropInPhotoPx(393, 852, 3024, 4032, 220);
    // cover scale = max(393/3024, 852/4032) ≈ 0.2113 → size ≈ 1041 px
    expect(c.size).toBeGreaterThan(1000);
    expect(c.size).toBeLessThan(1100);
    // Centered: originX ≈ (3024 - size)/2, originY ≈ (4032 - size)/2
    expect(c.originX).toBeCloseTo((3024 - c.size) / 2, 1);
    expect(c.originY).toBeCloseTo((4032 - c.size) / 2, 1);
  });

  it('handles raw sensor orientation (landscape photo, portrait layout)', () => {
    // skipProcessing: true often yields landscape photo for portrait preview
    const c = reticleCropInPhotoPx(393, 852, 4032, 3024, 220);
    // Same cover scale magnitude after orientation match
    expect(c.size).toBeGreaterThan(1000);
    expect(c.size).toBeLessThan(1100);
    expect(c.originX).toBeCloseTo((4032 - c.size) / 2, 1);
    expect(c.originY).toBeCloseTo((3024 - c.size) / 2, 1);
  });

  it('regression: does NOT use layout-space coords as photo-pixel coords', () => {
    // Bug being guarded against: passing layout-px origin (~87,316) directly
    // would land in the top-left corner of a multi-megapixel photo.
    const c = reticleCropInPhotoPx(393, 852, 3024, 4032, 220);
    expect(c.originX).toBeGreaterThan(500); // way past layout-px (87)
    expect(c.originY).toBeGreaterThan(500); // way past layout-px (316)
  });

  it('returns zero size for invalid inputs', () => {
    expect(reticleCropInPhotoPx(0, 852, 3024, 4032, 220).size).toBe(0);
    expect(reticleCropInPhotoPx(393, 852, 0, 4032, 220).size).toBe(0);
    expect(reticleCropInPhotoPx(393, 852, 3024, 4032, 0).size).toBe(0);
  });

  it('clamps crop to photo bounds for tiny photos', () => {
    const c = reticleCropInPhotoPx(393, 852, 100, 100, 220);
    expect(c.size).toBeLessThanOrEqual(100);
    expect(c.originX).toBeGreaterThanOrEqual(0);
    expect(c.originY).toBeGreaterThanOrEqual(0);
  });
});
