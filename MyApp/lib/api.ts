import { Platform } from 'react-native';
import Constants from 'expo-constants';

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
  /** JWT token for the Authorization header. Pass null/undefined to skip. */
  token?: string | null;
  /** Optional JSON body (object) — auto-serialized. Use rawBody for FormData. */
  json?: unknown;
  /** Pre-serialized body (e.g., FormData). Sets no Content-Type. */
  rawBody?: BodyInit | null;
  /** Per-request timeout in ms. Default 12_000. */
  timeoutMs?: number;
  /** AbortSignal from the caller (combined with internal timeout). */
  signal?: AbortSignal;
}

/**
 * Thin fetch wrapper: JSON in, JSON out, throws ApiError with parsed body on non-2xx.
 * - Adds Authorization header when `token` is provided.
 * - Times out after `timeoutMs` (default 12s) so the UI never spins forever.
 * - Handles empty bodies and non-JSON responses gracefully.
 */
export async function apiFetch<T = unknown>(path: string, init: ApiInit = {}): Promise<T> {
  const { token, json, rawBody, timeoutMs = 12_000, signal, headers, ...rest } = init;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    res = await fetch(`${API_URL}${path}`, { ...rest, headers: finalHeaders, body, signal: controller.signal });
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
    try { parsed = JSON.parse(text); } catch { parsed = text; }
  }

  if (!res.ok) {
    const message =
      (parsed && typeof parsed === 'object' && 'error' in (parsed as any) && (parsed as any).error) ||
      (parsed && typeof parsed === 'object' && 'message' in (parsed as any) && (parsed as any).message) ||
      `${res.status} ${res.statusText || 'Request failed'}`;
    throw new ApiError(res.status, String(message), parsed);
  }

  return parsed as T;
}
