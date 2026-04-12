import { saveInboxItem } from '@/lib/notificationInbox';
import { uviToDisplay, uviToRiskMeta } from '@/lib/uvIndexMeta';
import { getLocalDateKey } from '@/lib/vitalsDailyStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Single key — matches UV_SIG_KEY in notificationInbox.ts so clearInbox()
// wipes it on logout, letting UV items regenerate after re-login.
const UV_SIG_KEY = '@skinhealth/last_uv_inbox_sig';

export async function notifyUvInboxIfChanged(uv: number): Promise<void> {
  const rounded = Math.round(uv * 10) / 10;
  const todaySig = `${getLocalDateKey()}-${rounded}`;

  try {
    const prev = await AsyncStorage.getItem(UV_SIG_KEY);
    if (prev === todaySig) return; // already wrote this exact value today
    await AsyncStorage.setItem(UV_SIG_KEY, todaySig);
  } catch {
    return;
  }

  const meta = uviToRiskMeta(uv);

  await saveInboxItem({
    id: `uv-${getLocalDateKey()}-${rounded}`, // stable per (day, value) — safe to re-write after clear
    title: 'UV index update',
    body: `UV is ${uviToDisplay(uv)} UVI (${meta.label}) near you.`,
    createdAt: new Date().toISOString(),
  });
}
