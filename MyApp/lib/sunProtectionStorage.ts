import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDateKey } from '@/lib/vitalsDailyStorage';

const PREFIX = '@skinhealth/sunprotect';

export type SunProtectState = {
  dateKey: string;
  appliedCount: number;
  lastAppliedISO: string | null;
};

export async function loadSunProtect(): Promise<SunProtectState> {
  try {
    const [date, count, last] = await Promise.all([
      AsyncStorage.getItem(`${PREFIX}/date`),
      AsyncStorage.getItem(`${PREFIX}/count`),
      AsyncStorage.getItem(`${PREFIX}/last`),
    ]);
    const today = getLocalDateKey();
    if (date !== today) {
      return { dateKey: today, appliedCount: 0, lastAppliedISO: null };
    }
    return {
      dateKey: today,
      appliedCount: count ? Number.parseInt(count, 10) || 0 : 0,
      lastAppliedISO: last,
    };
  } catch {
    return { dateKey: getLocalDateKey(), appliedCount: 0, lastAppliedISO: null };
  }
}

export async function persistSunProtect(s: SunProtectState): Promise<void> {
  await AsyncStorage.multiSet([
    [`${PREFIX}/date`, s.dateKey],
    [`${PREFIX}/count`, String(s.appliedCount)],
    [`${PREFIX}/last`, s.lastAppliedISO ?? ''],
  ]);
}
