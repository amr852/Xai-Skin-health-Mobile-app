import { Image } from 'react-native';

export type ImageSize = { width: number; height: number };

/**
 * Resolve an image's pixel dimensions from its URI.
 *
 * SDK 54's `takePictureAsync` (PictureRef-typed) can omit `width`/`height`
 * on the returned photo. The reticle crop (`reticleCropInPhotoPx`) needs the
 * true source-photo pixel size — without it the crop step used to silently
 * fall back to the full frame. Returns null when the size can't be decoded;
 * callers decide whether to proceed uncropped or fail.
 */
const GET_SIZE_TIMEOUT_MS = 2_000;

export function getImageSizeForUri(uri: string): Promise<ImageSize | null> {
  return new Promise(resolve => {
    if (typeof Image.getSize !== 'function') {
      resolve(null);
      return;
    }
    let settled = false;
    const finish = (size: ImageSize | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(size);
    };
    // Native decode can stall (and test mocks never call back) — cap the wait
    // so callers fall through to their uncropped path instead of hanging.
    const timer = setTimeout(() => finish(null), GET_SIZE_TIMEOUT_MS);
    try {
      Image.getSize(
        uri,
        (width, height) =>
          finish(width > 0 && height > 0 ? { width, height } : null),
        () => finish(null),
      );
    } catch {
      finish(null);
    }
  });
}

/** Use the photo's own dimensions when present, else decode them from disk. */
export async function resolvePhotoSize(
  uri: string,
  width: number | undefined,
  height: number | undefined,
): Promise<ImageSize | null> {
  if (width && height && width > 0 && height > 0) return { width, height };
  return getImageSizeForUri(uri);
}
