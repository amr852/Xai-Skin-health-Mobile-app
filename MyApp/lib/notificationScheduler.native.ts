import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { WATER_TARGET_L } from '@/components/vitals/vitalsFormat';
import { saveInboxItem } from '@/lib/notificationInbox';
import { loadStoredVitals, getLocalDateKey } from '@/lib/vitalsDailyStorage';

// WATER_INBOX_SENT_KEY removed — saveInboxItem deduplicates by ID

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
  await Notifications.setNotificationChannelAsync('urgent', {
    name: 'Urgent lesion alerts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 400, 200, 400],
    lightColor: '#D32F2F',
  });
}

export function setNotificationPresentationDefaults(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,   // backward compat (SDK ≤ 50)
      shouldShowBanner: true,  // SDK 51+
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

/**
 * Proactively adds water reminder inbox items for every reminder hour that has
 * already passed today but hasn't been logged yet. Call this on app launch and
 * whenever the app returns to the foreground. This ensures inbox entries appear
 * even if the user dismissed the system notification without tapping it.
 */
/**
 * Writes a water reminder inbox item for every WATER_HOURS slot that has
 * already passed today AND the user is still below their water goal.
 * Safe to call multiple times — saveInboxItem deduplicates by ID so each
 * slot only ever produces one inbox entry per day.
 * Does NOT require native notification support — inbox works on all platforms.
 */
export async function syncWaterInboxItems(): Promise<void> {
  try {
    const { water: wRaw } = await loadStoredVitals();
    const water = Number.isFinite(wRaw) ? wRaw : 0;
    if (water >= WATER_TARGET_L) return;

    const now = new Date();
    const todayKey = getLocalDateKey(now);
    const currentHour = now.getHours();

    for (const hour of WATER_HOURS) {
      if (currentHour >= hour) {
        const firedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0);
        await saveInboxItem({
          id: `water-inbox-${todayKey}-${hour}`,
          title: 'Time to hydrate 💧',
          body: "You haven't reached today's water goal yet — grab a glass of water.",
          createdAt: firedAt.toISOString(),
        });
      }
    }
  } catch {
    /* silently ignore */
  }
}

const URGENT_ALERTS_KEY = '@skinhealth/urgentAlerts';
const URGENT_RESEND_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

type UrgentAlertRecord = {
  lastNotifiedAt: string; // ISO timestamp
  dismissed: boolean;
};
type UrgentAlertStore = Record<string, UrgentAlertRecord>; // keyed by lesionId

async function loadUrgentStore(): Promise<UrgentAlertStore> {
  try {
    const raw = await AsyncStorage.getItem(URGENT_ALERTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveUrgentStore(store: UrgentAlertStore): Promise<void> {
  await AsyncStorage.setItem(URGENT_ALERTS_KEY, JSON.stringify(store));
}

/** Returns the current alert state for all lesions. */
export async function loadUrgentAlertStates(): Promise<UrgentAlertStore> {
  return loadUrgentStore();
}

/** Mark a lesion's urgent alert as dismissed — stops all future notifications for it. */
export async function dismissUrgentAlert(lesionId: string): Promise<void> {
  try {
    const store = await loadUrgentStore();
    store[lesionId] = {
      lastNotifiedAt: store[lesionId]?.lastNotifiedAt ?? new Date().toISOString(),
      dismissed: true,
    };
    await saveUrgentStore(store);
    await Notifications.cancelScheduledNotificationAsync(`urgent-${lesionId}`).catch(() => {});
  } catch {
    /* silently ignore */
  }
}

/**
 * For each non-dismissed urgent lesion, fires an immediate push notification
 * + inbox item if it has never been notified OR was last notified >24 hours ago.
 * Call this whenever lesions are loaded (MonitorLesionsSection) so the user
 * gets periodic reminders until they dismiss the alert.
 */
export async function syncUrgentLesionAlerts(
  lesions: { _id: string; title: string; status: string }[],
): Promise<void> {
  try {
    const urgentLesions = lesions.filter(l => l.status === 'Urgent');
    if (urgentLesions.length === 0) return;

    const store = await loadUrgentStore();
    const now = Date.now();
    const todayKey = getLocalDateKey();
    let changed = false;

    for (const lesion of urgentLesions) {
      const record = store[lesion._id];
      if (record?.dismissed) continue;

      const body = `"${lesion.title}" is marked Urgent — please consult a dermatologist.`;
      // One inbox entry per lesion per day — dedup in saveInboxItem handles repeated calls
      const inboxId = `urgent-${lesion._id}-${todayKey}`;

      // Always try to write inbox item (dedup by ID prevents doubles on same day)
      await saveInboxItem({
        id: inboxId,
        title: 'Urgent Lesion Alert',
        body,
        createdAt: new Date().toISOString(),
      });

      // Only send a push notification if 24 h have passed since the last one
      if (notificationsNativeSupported()) {
        const ok = await ensureNotificationPermissions();
        if (ok) {
          const lastNotified = record?.lastNotifiedAt
            ? new Date(record.lastNotifiedAt).getTime()
            : 0;
          if (now - lastNotified >= URGENT_RESEND_INTERVAL_MS) {
            await Notifications.scheduleNotificationAsync({
              identifier: `urgent-${lesion._id}`,
              content: {
                title: 'Urgent Lesion Alert',
                body,
                sound: true,
                data: { kind: 'urgent' as const, lesionId: lesion._id },
                ...(Platform.OS === 'android' ? { channelId: 'urgent' } : {}),
              },
              trigger: null,
            });
            store[lesion._id] = { lastNotifiedAt: new Date().toISOString(), dismissed: false };
            changed = true;
          }
        }
      }
    }

    if (changed) await saveUrgentStore(store);
  } catch {
    /* silently ignore */
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
  // Water inbox items are written proactively by syncWaterInboxItems.
  // Urgent inbox items are written by syncUrgentLesionAlerts.
  // This listener handles everything else (e.g. UV) and also catches
  // any notification the user taps when the app is in the background.
  const shouldSkip = (data: unknown): boolean => {
    const kind = contentKind(data);
    return kind === 'water' || kind === 'urgent';
  };

  const received = Notifications.addNotificationReceivedListener(n => {
    if (shouldSkip(n.request.content.data)) return;
    const { title, body } = n.request.content;
    void saveInboxItem({
      id: n.request.identifier,
      title: title ?? 'Notification',
      body: body ?? '',
      createdAt: new Date().toISOString(),
    });
  });

  const response = Notifications.addNotificationResponseReceivedListener(r => {
    if (shouldSkip(r.notification.request.content.data)) return;
    const { title, body } = r.notification.request.content;
    void saveInboxItem({
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
