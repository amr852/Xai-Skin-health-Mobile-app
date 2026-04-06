import AsyncStorage from '@react-native-async-storage/async-storage';

const getKey = (userId: string, key: string) => `@skinhealth/${userId}/${key}`;
const KEY_DATE = 'vitals_date';
const KEY_WATER = 'water_liters';
const KEY_SLEEP = 'sleep_hours';

export function getLocalDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function loadStoredVitals(userId: string): Promise<{
  storedDate: string | null;
  water: number;
  sleep: number;
}> {
  try {
    const [storedDate, w, s] = await Promise.all([
      AsyncStorage.getItem(getKey(userId, KEY_DATE)),
      AsyncStorage.getItem(getKey(userId, KEY_WATER)),
      AsyncStorage.getItem(getKey(userId, KEY_SLEEP)),
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

export async function persistVitals(
  userId: string,
  dateKey: string,
  water: number,
  sleep: number
): Promise<void> {
  await AsyncStorage.multiSet([
    [getKey(userId, KEY_DATE), dateKey],
    [getKey(userId, KEY_WATER), String(water)],
    [getKey(userId, KEY_SLEEP), String(sleep)],
  ]);
}
