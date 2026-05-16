import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import type { CameraView } from 'expo-camera';

import { API_URL, ApiError } from '@/lib/api';
import { getStoredToken } from '@/context/AuthContext';
import type { LesionBbox } from '@/lib/bboxLayout';

/**
 * Server normalizes coordinates 0..1 against the *uploaded* frame size; we
 * convert to absolute against `frameSize` so the camera screen can reuse the
 * existing `containLayout`/`bboxToOverlayRect` helpers to project onto the
 * live preview.
 */
export type LiveDetection = {
  bbox: LesionBbox;
  cls: string;
};

export type UseLiveDetectOptions = {
  cameraRef: React.RefObject<CameraView | null>;
  enabled: boolean;
  /** Hard fps cap; spec target is 3 fps. */
  fps?: number;
  /** Long-side downscale before upload (spec ~320 px). */
  maxSide?: number;
  /** Camera layout for reticle-region crop. */
  layoutSize?: { width: number; height: number };
};

export type UseLiveDetectResult = {
  detections: LiveDetection[];
  frameSize: { width: number; height: number } | null;
  /** True after 2 consecutive network errors. Caller shows banner + flips to Scan. */
  offline: boolean;
  /** Round-trip ms of the last completed request (dev affordance). */
  lastMs: number | null;
};

type DetectFastResponse = {
  boxes: Array<{ x: number; y: number; w: number; h: number; cls: string; conf: number }>;
  width: number;
  height: number;
  ms: number;
};

const DETECT_FAST_PATH = '/detect-fast';
const REQUEST_TIMEOUT_MS = 5_000;
const OFFLINE_AFTER_FAILURES = 2;

export function useLiveDetect({
  cameraRef,
  enabled,
  fps = 3,
  maxSide = 320,
  layoutSize,
}: UseLiveDetectOptions): UseLiveDetectResult {
  const [detections, setDetections] = useState<LiveDetection[]>([]);
  const [frameSize, setFrameSize] = useState<{ width: number; height: number } | null>(null);
  const [offline, setOffline] = useState(false);
  const [lastMs, setLastMs] = useState<number | null>(null);

  // Refs avoid re-creating the loop when consumer-visible state changes.
  const inFlightRef = useRef(false);
  const stopRef = useRef(false);
  const failureCountRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  // Default to active so the loop runs until AppState reports an explicit
  // background/inactive event (also tolerant of test environments where
  // currentState is undefined).
  const appActiveRef = useRef(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');

  const minInterval = Math.max(1, Math.round(1000 / Math.max(1, fps)));

  const captureAndDetect = useCallback(async (): Promise<boolean> => {
    const cam = cameraRef.current;
    if (!cam) return false;

    let uri: string | null = null;
    try {
      const photo = await cam.takePictureAsync({
        quality: 0.6,
        base64: false,
        skipProcessing: true,
        shutterSound: false,
      } as any);
      uri = photo?.uri ?? null;
    } catch {
      return false;
    }
    if (!uri) return false;

    let processedUri = uri;
    try {
      const ops = [];
      // Crop to reticle if layout provided
      if (layoutSize && layoutSize.width > 0 && layoutSize.height > 0) {
        const reticleSize = 220;
        const left = Math.max(0, (layoutSize.width - reticleSize) / 2);
        const top = Math.max(0, (layoutSize.height - reticleSize) / 2);
        ops.push({
          crop: {
            originX: left,
            originY: top,
            width: Math.min(reticleSize, layoutSize.width - left),
            height: Math.min(reticleSize, layoutSize.height - top),
          },
        });
      }
      // Resize for bandwidth
      ops.push({ resize: { width: maxSide } });

      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        ops,
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
      );
      processedUri = manipulated.uri ?? uri;
    } catch {
      /** Fall back to the raw capture — server still has the 512px ceiling. */
    }

    const token = await getStoredToken();
    const formData = new FormData();
    formData.append('image', {
      uri: Platform.OS === 'android' ? processedUri : processedUri.replace('file://', ''),
      type: 'image/jpeg',
      name: 'live.jpg',
    } as any);

    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${API_URL}${DETECT_FAST_PATH}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        // 4xx/5xx is still a successful round-trip — clear offline counter but skip update.
        failureCountRef.current = 0;
        return true;
      }
      const body = (await res.json()) as DetectFastResponse;
      if (!body || !Array.isArray(body.boxes)) return true;

      const W = body.width;
      const H = body.height;
      const next: LiveDetection[] = body.boxes
        .filter(b => b && b.w > 0 && b.h > 0)
        .map(b => ({
          cls: b.cls,
          bbox: {
            x1: b.x * W,
            y1: b.y * H,
            x2: (b.x + b.w) * W,
            y2: (b.y + b.h) * H,
            conf: b.conf,
          },
        }));

      setDetections(next);
      setFrameSize({ width: W, height: H });
      setLastMs(typeof body.ms === 'number' ? body.ms : null);
      failureCountRef.current = 0;
      setOffline(false);
      return true;
    } catch (e) {
      clearTimeout(timer);
      if ((e as ApiError)?.name === 'AbortError' || (e as Error)?.message?.includes('aborted')) {
        return false;
      }
      failureCountRef.current += 1;
      if (failureCountRef.current >= OFFLINE_AFTER_FAILURES) {
        setOffline(true);
      }
      return false;
    } finally {
      abortRef.current = null;
    }
  }, [cameraRef, maxSide, layoutSize]);

  useEffect(() => {
    if (!enabled) {
      stopRef.current = true;
      abortRef.current?.abort();
      setDetections([]);
      setOffline(false);
      setLastMs(null);
      failureCountRef.current = 0;
      return;
    }

    stopRef.current = false;
    let active = true;

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      appActiveRef.current = next !== 'background' && next !== 'inactive';
    });

    (async () => {
      while (active && !stopRef.current) {
        if (!appActiveRef.current || inFlightRef.current) {
          await new Promise(r => setTimeout(r, minInterval));
          continue;
        }
        inFlightRef.current = true;
        const startedAt = Date.now();
        await captureAndDetect();
        inFlightRef.current = false;
        if (stopRef.current) break;

        const elapsed = Date.now() - startedAt;
        const wait = Math.max(0, minInterval - elapsed);
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
      }
    })();

    return () => {
      active = false;
      stopRef.current = true;
      abortRef.current?.abort();
      sub.remove();
    };
  }, [enabled, captureAndDetect, minInterval]);

  return { detections, frameSize, offline, lastMs };
}
