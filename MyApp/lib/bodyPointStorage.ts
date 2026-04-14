import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@skinhealth/bodyPoints';

export type BodyPoint = {
  x: number;       // 0..1 normalized to silhouette box
  y: number;       // 0..1 normalized to silhouette box
  side: 'front' | 'back';
};

export type BodyPointMap = Record<string, BodyPoint>;

export async function loadBodyPoints(): Promise<BodyPointMap> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as BodyPointMap : {};
  } catch {
    return {};
  }
}

export async function saveBodyPoint(lesionId: string, point: BodyPoint): Promise<void> {
  try {
    const all = await loadBodyPoints();
    all[lesionId] = point;
    await AsyncStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export async function removeBodyPoint(lesionId: string): Promise<void> {
  try {
    const all = await loadBodyPoints();
    delete all[lesionId];
    await AsyncStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}
