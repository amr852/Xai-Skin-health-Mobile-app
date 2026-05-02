import { useEffect, useState, useRef } from 'react';
import { AppState } from 'react-native';
import { apiFetch, ApiError } from '@/lib/api';

export type ApiHealthStatus = 'checking' | 'ok' | 'down';

interface HealthResponse { ok: boolean; mongo: boolean }

/**
 * Polls /health on app focus + every 30s while foregrounded.
 * `down` is only emitted after the initial 2s grace, so a slow first
 * fetch doesn't flash a misleading banner.
 */
export function useApiHealth() {
  const [status, setStatus] = useState<ApiHealthStatus>('checking');
  const [mongoOk, setMongoOk] = useState<boolean | null>(null);
  const lastCheckRef = useRef<number>(0);

  useEffect(() => {
    let alive = true;
    let interval: ReturnType<typeof setInterval> | null = null;
    const graceTimer = setTimeout(() => {
      // After 2 s, allow `down` to surface in case the very first probe is slow.
      if (alive && status === 'checking') setStatus(prev => prev);
    }, 2_000);

    const probe = async () => {
      const now = Date.now();
      if (now - lastCheckRef.current < 1500) return; // throttle
      lastCheckRef.current = now;
      try {
        const data = await apiFetch<HealthResponse>('/health', { timeoutMs: 5_000 });
        if (!alive) return;
        setStatus('ok');
        setMongoOk(!!data.mongo);
      } catch (e) {
        if (!alive) return;
        // Network/timeout (status 0) = down. 4xx/5xx still means *something* responded.
        setStatus(e instanceof ApiError && e.status > 0 ? 'ok' : 'down');
      }
    };

    void probe();
    interval = setInterval(probe, 30_000);

    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') void probe();
    });

    return () => {
      alive = false;
      clearTimeout(graceTimer);
      if (interval) clearInterval(interval);
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, mongoOk };
}
