import AsyncStorage from '@react-native-async-storage/async-storage';
import { appendInboxItem } from '@/lib/notificationInbox';
import { uviToDisplay, uviToRiskMeta } from '@/lib/uvIndexMeta';
import { getLocalDateKey } from '@/lib/vitalsDailyStorage';

const UV_SIG_KEY = '@skinhealth/last_uv_inbox_sig';

/** One inbox entry per local day per UV reading (0.1 step); survives app restart. */
export async function notifyUvInboxIfChanged(uv: number): Promise<void> {
  const rounded = Math.round(uv * 10) / 10;
  const sig = `${getLocalDateKey()}-${rounded}`;
  try {
    const prev = await AsyncStorage.getItem(UV_SIG_KEY);
    if (prev === sig) return;
    await AsyncStorage.setItem(UV_SIG_KEY, sig);
  } catch {
    return;
  }
  const meta = uviToRiskMeta(uv);
  await appendInboxItem({
    title: 'UV index update',
    body: `UV is ${uviToDisplay(uv)} UVI (${meta.label}) near you.`,
    kind: 'uv',
    force: true,
  });
}
