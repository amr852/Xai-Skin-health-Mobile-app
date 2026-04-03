import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { VitalCardProps } from '@/components/vitals/VitalCard';
import { C } from '@/constants/theme';
import {
  SLEEP_TARGET_H,
  WATER_TARGET_L,
  vitalsStatusFromTargetPct,
} from '@/components/vitals/vitalsFormat';
import {
  getLocalDateKey,
  loadStoredVitals,
  persistVitals,
} from '@/lib/vitalsDailyStorage';
import { syncWaterReminders } from '@/lib/notificationScheduler';

export function useHomeVitals() {
  const [waterLiters, setWaterLiters] = useState(0);
  const [sleepHours, setSleepHours] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const lastDateKeyRef = useRef(getLocalDateKey());

  useEffect(() => {
    let alive = true;
    (async () => {
      const { storedDate, water: wRaw, sleep: sRaw } = await loadStoredVitals();
      const today = getLocalDateKey();
      const water = Number.isFinite(wRaw) ? wRaw : 0;
      const sleep = Number.isFinite(sRaw) ? sRaw : 0;

      if (!alive) return;

      if (storedDate == null || storedDate !== today) {
        lastDateKeyRef.current = today;
        setWaterLiters(0);
        setSleepHours(0);
        await persistVitals(today, 0, 0);
      } else {
        lastDateKeyRef.current = today;
        setWaterLiters(water);
        setSleepHours(sleep);
      }
      setHydrated(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const rollIfNewDay = useCallback(() => {
    const today = getLocalDateKey();
    if (today !== lastDateKeyRef.current) {
      lastDateKeyRef.current = today;
      setWaterLiters(0);
      setSleepHours(0);
      void persistVitals(today, 0, 0);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') rollIfNewDay();
    });
    const tick = setInterval(rollIfNewDay, 60_000);
    return () => {
      sub.remove();
      clearInterval(tick);
    };
  }, [hydrated, rollIfNewDay]);

  useEffect(() => {
    if (!hydrated) return;
    void persistVitals(getLocalDateKey(), waterLiters, sleepHours);
  }, [waterLiters, sleepHours, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    void syncWaterReminders(waterLiters);
  }, [hydrated, waterLiters]);

  const vitals: VitalCardProps[] = useMemo(() => {
    const waterAtTarget = waterLiters >= WATER_TARGET_L;
    const sleepAtTarget = sleepHours >= SLEEP_TARGET_H;
    const sleepTier = vitalsStatusFromTargetPct((sleepHours / SLEEP_TARGET_H) * 100);
    const waterTier = vitalsStatusFromTargetPct((waterLiters / WATER_TARGET_L) * 100);
    return [
      {
        layout: 'wave',
        icon: 'droplet',
        iconBg: C.blueLight,
        iconColor: C.blue,
        label: 'Water',
        value: waterLiters.toFixed(1),
        unit: 'L',
        status: waterAtTarget ? 'You are hydrated!' : waterTier,
        statusColor: C.blue,
        fillColor: C.blueFill,
        fillPct: Math.min(100, Math.round((waterLiters / WATER_TARGET_L) * 100)),
        vsGoalRight: `${WATER_TARGET_L} liters`,
        hideGoalFooter: true,
        onStepDown: () =>
          setWaterLiters(w => Math.max(0, Math.round((w - 0.1) * 10) / 10)),
        onStepUp: () =>
          setWaterLiters(w => Math.min(WATER_TARGET_L, Math.round((w + 0.1) * 10) / 10)),
        stepDownDisabled: waterLiters <= 0,
        stepUpDisabled: waterLiters >= WATER_TARGET_L,
      },
      {
        layout: 'sleepWave',
        icon: 'moon',
        iconBg: C.purpleLight,
        iconColor: C.purple,
        label: 'Sleep',
        value: String(sleepHours),
        unit: 'h',
        status: sleepAtTarget ? 'You are rested and recovered!' : sleepTier,
        statusColor: C.purple,
        fillColor: C.purpleFill,
        fillPct: Math.min(100, Math.round((sleepHours / SLEEP_TARGET_H) * 100)),
        sleepTargetHours: SLEEP_TARGET_H,
        sleepTargetDisplay: `${SLEEP_TARGET_H} hours`,
        hideGoalFooter: true,
        onStepDown: () =>
          setSleepHours(h => Math.max(0, Math.round((h - 0.25) * 100) / 100)),
        onStepUp: () =>
          setSleepHours(h => Math.min(SLEEP_TARGET_H, Math.round((h + 0.25) * 100) / 100)),
        stepDownDisabled: sleepHours <= 0,
        stepUpDisabled: sleepHours >= SLEEP_TARGET_H,
      },
    ];
  }, [waterLiters, sleepHours]);

  return { vitals };
}
