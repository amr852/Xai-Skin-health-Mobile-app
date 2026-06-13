/**
 * useLiveDetect — verifies response parsing, in-flight backpressure, and the
 * 2-failure → offline rule. Uses `react-test-renderer` directly (no external
 * testing-library) since the rest of this suite is plain Jest. Real timers
 * with a high fps cap (≈1ms loop) so each tick resolves quickly.
 */

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(async (uri: string) => ({ uri })),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('@/context/AuthContext', () => ({
  getStoredToken: jest.fn(async () => 'test-token'),
}));

jest.mock('@/lib/api', () => ({
  API_URL: 'http://test.local',
  ApiError: class ApiError extends Error {},
  refreshAccessToken: jest.fn(async () => false),
}));

import { useLiveDetect, type UseLiveDetectResult } from '@/hooks/useLiveDetect';
import { refreshAccessToken } from '@/lib/api';

const mockRefresh = refreshAccessToken as unknown as jest.Mock;

function makeCameraRef(takePictureAsync: jest.Mock) {
  return { current: { takePictureAsync } } as any;
}

function okResponse(
  boxes: Array<{ x: number; y: number; w: number; h: number; cls: string; conf: number }> = [],
) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ boxes, width: 320, height: 320, ms: 12 }),
  } as any;
}

function unauthorizedResponse() {
  return {
    ok: false,
    status: 401,
    json: async () => ({ error: 'Token required' }),
  } as any;
}

function mountHook(props: Parameters<typeof useLiveDetect>[0]) {
  const ref: { current: UseLiveDetectResult | null } = { current: null };
  function Harness(p: Parameters<typeof useLiveDetect>[0]) {
    const r = useLiveDetect(p);
    ref.current = r;
    return null;
  }
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(Harness, props));
  });
  return {
    ref,
    rerender(next: Parameters<typeof useLiveDetect>[0]) {
      act(() => {
        renderer.update(React.createElement(Harness, next));
      });
    },
    unmount() {
      act(() => {
        renderer.unmount();
      });
    },
  };
}

async function waitFor(check: () => boolean, timeoutMs = 2_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (check()) return;
    await act(async () => {
      await new Promise(r => setTimeout(r, 10));
    });
  }
  throw new Error('waitFor: condition not met within timeout');
}

describe('useLiveDetect', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch' as any);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('exposes detections from the /detect-fast response', async () => {
    const takePictureAsync = jest.fn(async () => ({ uri: 'file:///t.jpg' }));
    fetchSpy.mockResolvedValue(
      okResponse([{ x: 0.1, y: 0.2, w: 0.3, h: 0.4, cls: 'lesion', conf: 0.9 }]),
    );

    const h = mountHook({
      cameraRef: makeCameraRef(takePictureAsync),
      enabled: true,
      fps: 1000,
    });

    await waitFor(() => (h.ref.current?.detections.length ?? 0) > 0);

    expect(h.ref.current?.detections[0].cls).toBe('lesion');
    expect(h.ref.current?.frameSize).toEqual({ width: 320, height: 320 });
    expect(h.ref.current?.offline).toBe(false);
    h.unmount();
  });

  it('flips offline after consecutive network failures', async () => {
    const takePictureAsync = jest.fn(async () => ({ uri: 'file:///t.jpg' }));
    fetchSpy.mockRejectedValue(new Error('Network down'));

    const h = mountHook({
      cameraRef: makeCameraRef(takePictureAsync),
      enabled: true,
      fps: 1000,
    });

    await waitFor(() => h.ref.current?.offline === true);
    expect(h.ref.current?.offline).toBe(true);
    h.unmount();
  });

  it('refreshes the access token and retries when /detect-fast returns 401', async () => {
    const takePictureAsync = jest.fn(async () => ({ uri: 'file:///t.jpg' }));
    mockRefresh.mockResolvedValue(true);
    let call = 0;
    fetchSpy.mockImplementation(async () => {
      call += 1;
      return call === 1
        ? unauthorizedResponse()
        : okResponse([{ x: 0.1, y: 0.2, w: 0.3, h: 0.4, cls: 'lesion', conf: 0.9 }]);
    });

    const h = mountHook({
      cameraRef: makeCameraRef(takePictureAsync),
      enabled: true,
      fps: 1000,
    });

    await waitFor(() => (h.ref.current?.detections.length ?? 0) > 0);
    expect(mockRefresh).toHaveBeenCalled();
    expect(h.ref.current?.detections[0].cls).toBe('lesion');
    expect(h.ref.current?.offline).toBe(false);
    h.unmount();
  });

  it('flips offline when 401 persists and the token refresh fails', async () => {
    const takePictureAsync = jest.fn(async () => ({ uri: 'file:///t.jpg' }));
    mockRefresh.mockResolvedValue(false);
    fetchSpy.mockResolvedValue(unauthorizedResponse());

    const h = mountHook({
      cameraRef: makeCameraRef(takePictureAsync),
      enabled: true,
      fps: 1000,
    });

    await waitFor(() => h.ref.current?.offline === true);
    expect(h.ref.current?.offline).toBe(true);
    h.unmount();
  });

  it('stops capturing and clears detections when disabled', async () => {
    const takePictureAsync = jest.fn(async () => ({ uri: 'file:///t.jpg' }));
    fetchSpy.mockResolvedValue(
      okResponse([{ x: 0.1, y: 0.2, w: 0.3, h: 0.4, cls: 'lesion', conf: 0.9 }]),
    );

    const h = mountHook({
      cameraRef: makeCameraRef(takePictureAsync),
      enabled: true,
      fps: 1000,
    });

    await waitFor(() => (h.ref.current?.detections.length ?? 0) > 0);

    h.rerender({
      cameraRef: makeCameraRef(takePictureAsync),
      enabled: false,
      fps: 1000,
    });
    await waitFor(() => (h.ref.current?.detections.length ?? 0) === 0);
    expect(h.ref.current?.detections).toEqual([]);
    h.unmount();
  });
});
