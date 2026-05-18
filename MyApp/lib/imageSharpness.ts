import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'jpeg-js';
import { Platform } from 'react-native';

const RESIZE_WIDTH = 288;

/** Lenient cutoff so borderline photos are not over-flagged as blurry. */
export const LAPLACIAN_VARIANCE_THRESHOLD = 6;

/**
 * Gallery picks are often re-encoded (lower variance than raw camera captures)
 * and the user already chose the image deliberately — only reject truly
 * unusable shots.
 */
export const GALLERY_LAPLACIAN_VARIANCE_THRESHOLD = 2;

/** Laplacian variance on resized JPEG (blur → low variance). */
function laplacianVarianceGrayscaleGray(gray: Float32Array, w: number, h: number): number {
  if (w < 3 || h < 3) return 0;

  const lap = new Float32Array((w - 2) * (h - 2));
  let i = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = gray[y * w + x];
      const lg =
        Math.abs(
          -gray[(y - 1) * w + x]
          - gray[(y + 1) * w + x]
          - gray[y * w + (x - 1)]
          - gray[y * w + (x + 1)]
          + 4 * p,
        );
      lap[i++] = lg;
    }
  }

  const n = lap.length;
  let mean = 0;
  for (let j = 0; j < n; j++) mean += lap[j];
  mean /= n;
  let v = 0;
  for (let j = 0; j < n; j++) {
    const d = lap[j] - mean;
    v += d * d;
  }
  return v / n;
}

function rgbaToGray(rgba: Uint8Array, w: number, h: number): Float32Array {
  const gray = new Float32Array(w * h);
  for (let i = 0, j = 0; i < rgba.length && j < w * h; i += 4, j++) {
    gray[j] = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
  }
  return gray;
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64.replace(/\s/g, ''));
  const len = binary.length;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** Returns variance; higher = sharper (typ. well-focused skin photos exceed threshold). */
export async function laplacianVarianceForImageUri(uri: string): Promise<number> {
  if (Platform.OS === 'web') {
    return LAPLACIAN_VARIANCE_THRESHOLD + 1;
  }

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: RESIZE_WIDTH } }],
    { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );

  if (!result.base64) throw new Error('Could not decode image');

  const bytes = base64ToUint8(result.base64);
  const decoded = decode(bytes, { useTArray: true, formatAsRGBA: true });
  if (!decoded.width || !decoded.height) return 0;
  const gray = rgbaToGray(decoded.data, decoded.width, decoded.height);
  return laplacianVarianceGrayscaleGray(gray, decoded.width, decoded.height);
}
