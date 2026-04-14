import { useCallback, useEffect, useState } from 'react';
import {
  loadSunProtect,
  persistSunProtect,
  type SunProtectState,
} from '@/lib/sunProtectionStorage';
import { getLocalDateKey } from '@/lib/vitalsDailyStorage';
import { syncSunReminders } from '@/lib/notificationScheduler';

export function useSunProtection() {
  const [state, setState] = useState<SunProtectState>({
    dateKey: getLocalDateKey(),
    appliedCount: 0,
    lastAppliedISO: null,
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await loadSunProtect();
      if (alive) {
        setState(s);
        setHydrated(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void persistSunProtect(state);
    void syncSunReminders(state.appliedCount);
  }, [hydrated, state]);

  const logApplication = useCallback(() => {
    setState(s => ({
      dateKey: getLocalDateKey(),
      appliedCount: s.appliedCount + 1,
      lastAppliedISO: new Date().toISOString(),
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      dateKey: getLocalDateKey(),
      appliedCount: 0,
      lastAppliedISO: null,
    });
  }, []);

  return { ...state, logApplication, reset };
}
