import { containLayout, bboxToOverlayRect, type LesionBbox } from '@/lib/bboxLayout';

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
