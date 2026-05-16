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

/**
 * Map a screen-space centered reticle to a crop rect in source-photo pixels.
 *
 * The camera preview uses aspect-fill (cover) semantics, so a square reticle
 * of side `reticleSize` (in layout px) covers a square of side
 * `reticleSize / coverScale` in photo px. The photo may also arrive in raw
 * sensor orientation (landscape) when the preview is portrait — handle that
 * by matching aspect orientations before computing the cover scale.
 *
 * Returns origin in photo-pixel space; size is the side length of the square.
 */
export function reticleCropInPhotoPx(
  layoutW: number,
  layoutH: number,
  photoW: number,
  photoH: number,
  reticleSize: number,
): { originX: number; originY: number; size: number } {
  if (layoutW <= 0 || layoutH <= 0 || photoW <= 0 || photoH <= 0 || reticleSize <= 0) {
    return { originX: 0, originY: 0, size: 0 };
  }
  const orientationMatches = (photoW >= photoH) === (layoutW >= layoutH);
  const photoAsLayoutW = orientationMatches ? photoW : photoH;
  const photoAsLayoutH = orientationMatches ? photoH : photoW;
  const coverScale = Math.max(layoutW / photoAsLayoutW, layoutH / photoAsLayoutH);
  const sizeInPhoto = Math.min(reticleSize / coverScale, photoW, photoH);
  return {
    originX: Math.max(0, (photoW - sizeInPhoto) / 2),
    originY: Math.max(0, (photoH - sizeInPhoto) / 2),
    size: sizeInPhoto,
  };
}

export function resolveImagePreviewFrame({
  width,
  fallbackHeight,
  imageW,
  imageH,
}: {
  width: number | string;
  fallbackHeight: number;
  imageW?: number | null;
  imageH?: number | null;
}) {
  if (typeof width !== 'number' && imageW && imageH && imageW > 0 && imageH > 0) {
    return { aspectRatio: imageW / imageH };
  }

  return { height: fallbackHeight };
}
