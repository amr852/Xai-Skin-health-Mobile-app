import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveInboxItem } from '@/lib/notificationInbox';
import { uviToDisplay, uviToRiskMeta } from '@/lib/uvIndexMeta';
import { getLocalDateKey } from '@/lib/vitalsDailyStorage';

async function getUvSigKey(): Promise<string> {
  const raw = await AsyncStorage.getItem('authUser');
  if (!raw) return '@skinhealth/last_uv_inbox_sig:guest';
  const user = JSON.parse(raw);
  const uid = user._id ?? user.id ?? 'guest';
  return `@skinhealth/last_uv_inbox_sig:${uid}`;
}

export async function notifyUvInboxIfChanged(uv: number): Promise<void> {
  const rounded = Math.round(uv * 10) / 10;
  const sig = `${getLocalDateKey()}-${rounded}`;

  try {
    const key = await getUvSigKey();
    const prev = await AsyncStorage.getItem(key);

    if (prev === sig) return;

    await AsyncStorage.setItem(key, sig);
  } catch {
    return;
  }

  const meta = uviToRiskMeta(uv);

  await saveInboxItem({
    id: `uv-${Date.now()}`, 
    title: 'UV index update',
    body: `UV is ${uviToDisplay(uv)} UVI (${meta.label}) near you.`,
    createdAt: new Date().toISOString(),
  });
}