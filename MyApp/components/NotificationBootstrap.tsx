import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import {
  ensureNotificationPermissions,
  ensureSunProtectionSchedule,
  ensureUvDigestSchedule,
  ensureWaterRemindersSchedule,
  notificationsNativeSupported,
  registerInboxFromNotifications,
  setNotificationPresentationDefaults,
  setupAndroidChannels,
  syncSunInboxItems,
  syncWaterInboxItems,
} from '@/lib/notificationScheduler';

/** Only run water inbox sync when a real user is logged in (authUser in storage). */
async function syncWaterIfLoggedIn(): Promise<void> {
  const raw = await AsyncStorage.getItem('authUser');
  if (!raw) return; // not logged in yet — skip, home screen will trigger after login
  await syncWaterInboxItems();
}

async function syncSunIfLoggedIn(): Promise<void> {
  const raw = await AsyncStorage.getItem('authUser');
  if (!raw) return;
  await syncSunInboxItems();
}

export function NotificationBootstrap() {
  const router = useRouter();

  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!notificationsNativeSupported()) return;
    if (!lastResponse) return;
    const data = lastResponse.notification.request.content.data as Record<string, unknown>;
    if (data?.kind === 'urgent') {
      router.push('/history');
    }
  }, [lastResponse, router]);

  useEffect(() => {
    setNotificationPresentationDefaults();

    // Water inbox sync runs on all platforms (pure AsyncStorage, no push needed)
    void syncWaterIfLoggedIn();
    void syncSunIfLoggedIn();

    const onAppState = (next: AppStateStatus) => {
      if (next === 'active') {
        void syncWaterIfLoggedIn();
        void syncSunIfLoggedIn();
      }
    };
    const sub = AppState.addEventListener('change', onAppState);

    if (!notificationsNativeSupported()) {
      return () => sub.remove();
    }

    let removeListeners: (() => void) | undefined;

    void (async () => {
      await setupAndroidChannels();
      await ensureNotificationPermissions();
      await ensureWaterRemindersSchedule();
      await ensureUvDigestSchedule();
      await ensureSunProtectionSchedule();
      removeListeners = registerInboxFromNotifications();
    })();

    return () => {
      removeListeners?.();
      sub.remove();
    };
  }, []);

  return null;
}
