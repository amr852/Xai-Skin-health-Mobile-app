import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  clearAuthStorage,
  getAccessToken,
  getRefreshToken,
  setTokenPair,
} from '@/lib/authStorage';

/**
 * Single source of truth for the API base URL.
 *
 * Resolution order (most specific first):
 *  1. EXPO_PUBLIC_API_URL env var (EAS profile or .env). Production-ready override.
 *  2. Expo Metro debugger host — auto-discovers the dev machine's LAN IP so a
 *     real device on the same Wi-Fi works without any env-var setup.
 *  3. Platform fallback for emulators.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.length > 0) return fromEnv.replace(/\/$/, '');

  // hostUri is e.g. "192.168.1.5:8081" — the LAN address Metro is serving from.
  // For a real device that loaded the JS bundle, this is the same LAN address
  // it can reach the API on (assuming both run on the same machine, which is
  // the standard dev-time setup).
  const hostUri =
    (Constants.expoConfig as any)?.hostUri ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ??
    (Constants as any).manifest?.debuggerHost ??
    null;
  const lanHost = typeof hostUri === 'string' ? hostUri.split(':')[0] : null;

  if (lanHost && Platform.OS !== 'web') {
    // Use the LAN host on native (real device or simulator). Works for both.
    return `http://${lanHost}:3000`;
  }

  if (Platform.OS === 'web')     return 'http://localhost:3000';
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000'; // emulator host loopback
  return 'http://localhost:3000'; // iOS simulator
}

export const API_URL = resolveApiUrl();

// Visible in dev so a teammate can sanity-check what the app is hitting.
if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log('[api] base URL:', API_URL);
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiInit extends Omit<RequestInit, 'body'> {
  /**
   * Access JWT for Authorization.
   * - `undefined` (default): read from MMKV / web storage (recommended).
   * - `null`: omit Authorization header.
   */
  token?: string | null;
  /** Optional JSON body (object) — auto-serialized. Use rawBody for FormData. */
  json?: unknown;
  /** Pre-serialized body (e.g., FormData). Sets no Content-Type. */
  rawBody?: BodyInit | null;
  /** Per-request timeout in ms. Default 12_000. */
  timeoutMs?: number;
  /** AbortSignal from the caller (combined with internal timeout). */
  signal?: AbortSignal;
  /** Internal: prevent refresh retry loops. */
  _didRefresh?: boolean;
}

type SessionListener = (access: string, refresh: string) => void;
type InvalidateListener = () => void;

let onSessionRefreshed: SessionListener | null = null;
let onSessionInvalidated: InvalidateListener | null = null;

/** AuthProvider registers so React state stays in sync after silent refresh. */
export function registerAuthListeners(
  onRefreshed: SessionListener | null,
  onInvalidated: InvalidateListener | null,
) {
  onSessionRefreshed = onRefreshed;
  onSessionInvalidated = onInvalidated;
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const p = (async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/users/refresh`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const text = await res.text();
      let parsed: Record<string, unknown> = {};
      if (text) {
        try {
          parsed = JSON.parse(text) as Record<string, unknown>;
        } catch {
          parsed = {};
        }
      }
      if (!res.ok) {
        clearAuthStorage();
        onSessionInvalidated?.();
        return false;
      }
      const access = parsed.token as string | undefined;
      const nextRefresh = parsed.refreshToken as string | undefined;
      if (!access || !nextRefresh) {
        clearAuthStorage();
        onSessionInvalidated?.();
        return false;
      }
      setTokenPair(access, nextRefresh);
      onSessionRefreshed?.(access, nextRefresh);
      return true;
    } catch {
      return false;
    }
  })();

  refreshInFlight = p;
  try {
    return await p;
  } finally {
    if (refreshInFlight === p) refreshInFlight = null;
  }
}

export function invalidateLocalSession() {
  clearAuthStorage();
  onSessionInvalidated?.();
}

function resolveAuthHeader(token: string | null | undefined): Record<string, string> {
  if (token === null) return {};
  const access = token !== undefined ? token : getAccessToken();
  return access ? { Authorization: `Bearer ${access}` } : {};
}

/**
 * Thin fetch wrapper: JSON in, JSON out, throws ApiError with parsed body on non-2xx.
 * - Adds Authorization header when `token` is provided.
 * - Times out after `timeoutMs` (default 12s) so the UI never spins forever.
 * - Handles empty bodies and non-JSON responses gracefully.
 */
export async function apiFetch<T = unknown>(path: string, init: ApiInit = {}): Promise<T> {
  const {
    token,
    json,
    rawBody,
    timeoutMs = 12_000,
    signal,
    headers,
    _didRefresh = false,
    ...rest
  } = init;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...resolveAuthHeader(token),
    ...(headers as Record<string, string> | undefined),
  };

  let body: BodyInit | undefined;
  if (rawBody !== undefined) {
    body = rawBody as BodyInit;
  } else if (json !== undefined) {
    body = JSON.stringify(json);
    finalHeaders['Content-Type'] = 'application/json';
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      body,
      signal: controller.signal,
    });
  } catch (e: any) {
    clearTimeout(timer);
    if (e?.name === 'AbortError') {
      throw new ApiError(0, 'Request timed out — check that the server is reachable.');
    }
    throw new ApiError(0, e?.message || 'Network error — server unreachable.');
  }
  clearTimeout(timer);

  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const code =
      parsed && typeof parsed === 'object' && 'code' in parsed
        ? String((parsed as { code?: string }).code)
        : undefined;
    if (
      res.status === 401 &&
      code === 'TOKEN_EXPIRED' &&
      !_didRefresh &&
      path !== '/users/refresh'
    ) {
      const refreshed = await tryRefreshAccessToken();
      if (refreshed) {
        return apiFetch<T>(path, { ...init, _didRefresh: true });
      }
    }

    const message =
      (parsed && typeof parsed === 'object' && 'error' in (parsed as any) && (parsed as any).error) ||
      (parsed && typeof parsed === 'object' && 'message' in (parsed as any) && (parsed as any).message) ||
      `${res.status} ${res.statusText || 'Request failed'}`;
    throw new ApiError(res.status, String(message), parsed);
  }

  return parsed as T;
}

/**
 * Multipart POST with the same TOKEN_EXPIRED → refresh → retry behaviour as apiFetch.
 */
export async function apiFetchFormData<T = unknown>(
  path: string,
  formData: FormData,
  init: { timeoutMs?: number; _didRefresh?: boolean } = {},
): Promise<T> {
  const timeoutMs = init.timeoutMs ?? 12_000;
  const _didRefresh = init._didRefresh ?? false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const access = getAccessToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
      },
      body: formData,
      signal: controller.signal,
    });
  } catch (e: any) {
    clearTimeout(timer);
    if (e?.name === 'AbortError') {
      throw new ApiError(0, 'Request timed out — check that the server is reachable.');
    }
    throw new ApiError(0, e?.message || 'Network error — server unreachable.');
  }
  clearTimeout(timer);

  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const code =
      parsed && typeof parsed === 'object' && 'code' in parsed
        ? String((parsed as { code?: string }).code)
        : undefined;
    if (res.status === 401 && code === 'TOKEN_EXPIRED' && !_didRefresh) {
      const refreshed = await tryRefreshAccessToken();
      if (refreshed) return apiFetchFormData<T>(path, formData, { ...init, _didRefresh: true });
    }
    const message =
      (parsed && typeof parsed === 'object' && 'error' in (parsed as any) && (parsed as any).error) ||
      (parsed && typeof parsed === 'object' && 'message' in (parsed as any) && (parsed as any).message) ||
      `${res.status} ${res.statusText || 'Request failed'}`;
    throw new ApiError(res.status, String(message), parsed);
  }

  return parsed as T;
}
