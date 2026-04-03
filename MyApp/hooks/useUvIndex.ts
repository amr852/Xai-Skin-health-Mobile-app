import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { notifyUvInboxIfChanged } from '@/lib/uvInboxNotify';

const OPEN_METEO =
  'https://api.open-meteo.com/v1/forecast';

export type UvIndexState = {
  uvi: number | null;
  loading: boolean;
  error: string | null;
  permissionDenied: boolean;
  subtitle: string;
};

export function useUvIndex(): UvIndexState & { refresh: () => Promise<void> } {
  const [uvi, setUvi] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [subtitle, setSubtitle] = useState('Locating…');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { status: existing } = await Location.getForegroundPermissionsAsync();
      let status = existing;
      if (existing !== Location.PermissionStatus.GRANTED) {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }
      if (status !== Location.PermissionStatus.GRANTED) {
        setPermissionDenied(true);
        setUvi(null);
        setSubtitle('Enable location for live UV near you');
        setLoading(false);
        return;
      }

      setPermissionDenied(false);
      setSubtitle('Fetching UV…');

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = pos.coords;

      const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current: 'uv_index',
        timezone: 'auto',
      });
      const res = await fetch(`${OPEN_METEO}?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Weather service unavailable');
      }
      const data = (await res.json()) as { current?: { uv_index?: number } };
      const raw = data.current?.uv_index;
      if (typeof raw !== 'number' || !Number.isFinite(raw)) {
        throw new Error('No UV data for this area');
      }

      setUvi(raw);
      setSubtitle('Right now near you');
      setError(null);
      void notifyUvInboxIfChanged(raw);
    } catch (e) {
      setUvi(null);
      setError(e instanceof Error ? e.message : 'Could not load UV index');
      setSubtitle('Pull down to retry');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    uvi,
    loading,
    error,
    permissionDenied,
    subtitle,
    refresh,
  };
}
