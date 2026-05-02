import { saveInboxItem } from '@/lib/notificationInbox';
import { uviToDisplay, uviToRiskMeta } from '@/lib/uvIndexMeta';
import { getLocalDateKey } from '@/lib/vitalsDailyStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Single key — matches UV_SIG_KEY in notificationInbox.ts so clearInbox()
// wipes it on logout, letting UV items regenerate after re-login.
const UV_SIG_KEY = '@skinhealth/last_uv_inbox_sig';

/**
 * Writes at most ONE UV digest item per day.
 *
 * Earlier this keyed by ${date}-${roundedValue}, which spammed the inbox: every
 * tiny UV oscillation (5.3 → 5.4 → 5.3) created a fresh "unread" item, so a
 * user who marked one read would get a duplicate seconds later. Product intent
 * is "one daily UV summary", so we dedupe by date only.
 */
export async function notifyUvInboxIfChanged(uv: number): Promise<void> {
  const todayKey = getLocalDateKey();

  try {
    const prev = await AsyncStorage.getItem(UV_SIG_KEY);
    if (prev === todayKey) return; // already wrote today's UV digest
    await AsyncStorage.setItem(UV_SIG_KEY, todayKey);
  } catch {
    return;
  }

  const meta = uviToRiskMeta(uv);

  await saveInboxItem({
    id: `uv-${todayKey}`, // one UV digest per day, ever — read state persists across refreshes
    title: 'UV index update',
    body: `UV is ${uviToDisplay(uv)} UVI (${meta.label}) near you.`,
    createdAt: new Date().toISOString(),
  });
}
