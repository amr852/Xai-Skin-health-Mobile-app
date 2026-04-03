import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_DATE = '@skinhealth/vitals_date';
const KEY_WATER = '@skinhealth/water_liters';
const KEY_SLEEP = '@skinhealth/sleep_hours';

export function getLocalDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function loadStoredVitals(): Promise<{
  storedDate: string | null;
  water: number;
  sleep: number;
}> {
  try {
    const [storedDate, w, s] = await Promise.all([
      AsyncStorage.getItem(KEY_DATE),
      AsyncStorage.getItem(KEY_WATER),
      AsyncStorage.getItem(KEY_SLEEP),
    ]);
    return {
      storedDate,
      water: w != null ? Number.parseFloat(w) : NaN,
      sleep: s != null ? Number.parseFloat(s) : NaN,
    };
  } catch {
    return { storedDate: null, water: NaN, sleep: NaN };
  }
}

export async function persistVitals(dateKey: string, water: number, sleep: number): Promise<void> {
  await AsyncStorage.multiSet([
    [KEY_DATE, dateKey],
    [KEY_WATER, String(water)],
    [KEY_SLEEP, String(sleep)],
  ]);
}
