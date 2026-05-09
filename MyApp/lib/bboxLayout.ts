/** Map model-space bboxes (full-image pixels) to a "contain" image preview. */

export type LesionBbox = { x1: number; y1: number; x2: number; y2: number; conf: number };

export type ContainLayout = {
  scale: number;
  offsetX: number;
  offsetY: number;
  drawW: number;
  drawH: number;
};

export function containLayout(
  containerW: number,
  containerH: number,
  imageW: number,
  imageH: number,
): ContainLayout {
  if (imageW <= 0 || imageH <= 0 || containerW <= 0 || containerH <= 0) {
    return {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      drawW: containerW,
      drawH: containerH,
    };
  }
  const scale = Math.min(containerW / imageW, containerH / imageH);
  const drawW = imageW * scale;
  const drawH = imageH * scale;
  const offsetX = (containerW - drawW) / 2;
  const offsetY = (containerH - drawH) / 2;
  return { scale, offsetX, offsetY, drawW, drawH };
}

export function bboxToOverlayRect(bbox: LesionBbox, layout: ContainLayout) {
  const { scale, offsetX, offsetY } = layout;
  const left = bbox.x1 * scale + offsetX;
  const top = bbox.y1 * scale + offsetY;
  const width = (bbox.x2 - bbox.x1) * scale;
  const height = (bbox.y2 - bbox.y1) * scale;
  return { left, top, width, height };
}
