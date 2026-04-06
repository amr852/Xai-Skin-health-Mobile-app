import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { WATER_TARGET_L } from '@/components/vitals/vitalsFormat';
import { saveInboxItem } from '@/lib/notificationInbox';
import { loadStoredVitals } from '@/lib/vitalsDailyStorage';

const WATER_IDS = ['water-0', 'water-1', 'water-2'] as const;
const WATER_HOURS = [9, 13, 17];
const UV_IDS = ['uv-0', 'uv-1'] as const;

export function notificationsNativeSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  if (!notificationsNativeSupported()) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function setupAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('water', {
    name: 'Water reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250],
    lightColor: '#1E7AAE',
  });
  await Notifications.setNotificationChannelAsync('uv', {
    name: 'UV index',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250],
    lightColor: '#C08010',
  });
}

export function setNotificationPresentationDefaults(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function cancelByIds(ids: readonly string[]): Promise<void> {
  for (const id of ids) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  }
}

export async function syncWaterReminders(waterLiters: number): Promise<void> {
  try {
    if (!notificationsNativeSupported()) return;
    const ok = await ensureNotificationPermissions();
    if (!ok) return;

    await cancelByIds(WATER_IDS);

    if (waterLiters >= WATER_TARGET_L) return;

    for (let i = 0; i < WATER_IDS.length; i++) {
      await Notifications.scheduleNotificationAsync({
        identifier: WATER_IDS[i],
        content: {
          title: 'Time to hydrate',
          body: "You haven't reached today's water goal yet — grab a glass of water.",
          sound: true,
          data: { kind: 'water' as const },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: WATER_HOURS[i],
          minute: 0,
          ...(Platform.OS === 'android' ? { channelId: 'water' } : {}),
        },
      });
    }
  } catch {
    /* scheduling failed */
  }
}

export async function ensureWaterRemindersSchedule(): Promise<void> {
  try {
    if (!notificationsNativeSupported()) return;
    const ok = await ensureNotificationPermissions();
    if (!ok) return;

    const { water: wRaw } = await loadStoredVitals();
    const water = Number.isFinite(wRaw) ? wRaw : 0;

    await cancelByIds(WATER_IDS);

    if (water >= WATER_TARGET_L) return;

    for (let i = 0; i < WATER_IDS.length; i++) {
      await Notifications.scheduleNotificationAsync({
        identifier: WATER_IDS[i],
        content: {
          title: 'Time to hydrate',
          body: "You haven't reached today's water goal yet — grab a glass of water.",
          sound: true,
          data: { kind: 'water' as const },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: WATER_HOURS[i],
          minute: 0,
          ...(Platform.OS === 'android' ? { channelId: 'water' } : {}),
        },
      });
    }
  } catch {
    /* scheduling failed */
  }
}

export async function ensureUvDigestSchedule(): Promise<void> {
  try {
    if (!notificationsNativeSupported()) return;
    const ok = await ensureNotificationPermissions();
    if (!ok) return;

    await cancelByIds(UV_IDS);

    await Notifications.scheduleNotificationAsync({
      identifier: UV_IDS[0],
      content: {
        title: 'UV index',
        body: 'Open the app to see today’s UV level before you go outside.',
        sound: true,
        data: { kind: 'uv' as const },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 30,
        ...(Platform.OS === 'android' ? { channelId: 'uv' } : {}),
      },
    });

    await Notifications.scheduleNotificationAsync({
      identifier: UV_IDS[1],
      content: {
        title: 'UV midday check',
        body: 'UV is often strongest around noon — check the app for the latest index.',
        sound: true,
        data: { kind: 'uv' as const },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 12,
        minute: 0,
        ...(Platform.OS === 'android' ? { channelId: 'uv' } : {}),
      },
    });
  } catch {
    /* scheduling failed */
  }
}

function contentKind(data: unknown): 'water' | 'uv' | 'system' {
  if (data && typeof data === 'object' && 'kind' in data) {
    const k = (data as { kind?: string }).kind;
    if (k === 'uv') return 'uv';
    if (k === 'water') return 'water';
  }
  return 'system';
}

export function registerInboxFromNotifications(): () => void {
  const received = Notifications.addNotificationReceivedListener(n => {
    const { title, body, data } = n.request.content;
    void  saveInboxItem({
      id: n.request.identifier,
      title: title ?? 'Notification',
      body: body ?? '',
      createdAt: new Date().toISOString(),
    });
  });

  const response = Notifications.addNotificationResponseReceivedListener(r => {
    const { title, body, data } = r.notification.request.content;
    void  saveInboxItem({
      id: r.notification.request.identifier,
      title: title ?? 'Notification',
      body: body ?? '',
      createdAt: new Date().toISOString(),
    });
  });

  return () => {
    received.remove();
    response.remove();
  };
}
