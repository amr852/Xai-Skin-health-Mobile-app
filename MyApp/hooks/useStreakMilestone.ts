import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@skinhealth/streakMilestone';
const MILESTONES = [3, 7, 14, 30] as const;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Returns a `fire` counter that ticks up once per new milestone reached.
export function useStreakMilestone(currentStreak: number): number {
  const [fire, setFire] = useState(0);

  useEffect(() => {
    if (currentStreak <= 0) return;
    const milestone = [...MILESTONES].reverse().find(m => currentStreak >= m);
    if (!milestone) return;

    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        const rec: { milestone?: number; date?: string } = raw ? JSON.parse(raw) : {};
        const stamp = `${milestone}-${todayKey()}`;
        const last = rec.milestone && rec.date ? `${rec.milestone}-${rec.date}` : '';
        if (stamp === last) return;
        if (cancelled) return;
        await AsyncStorage.setItem(KEY, JSON.stringify({ milestone, date: todayKey() }));
        setFire(x => x + 1);
      } catch {
        /* ignore */
      }
    })();

    return () => { cancelled = true; };
  }, [currentStreak]);

  return fire;
}
