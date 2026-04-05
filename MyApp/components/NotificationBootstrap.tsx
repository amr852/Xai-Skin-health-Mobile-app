import { useEffect } from 'react';
import {
  ensureNotificationPermissions,
  ensureUvDigestSchedule,
  ensureWaterRemindersSchedule,
  notificationsNativeSupported,
  registerInboxFromNotifications,
  setNotificationPresentationDefaults,
  setupAndroidChannels,
} from '@/lib/notificationScheduler';

export function NotificationBootstrap() {
  useEffect(() => {
    setNotificationPresentationDefaults();
    if (!notificationsNativeSupported()) return;

    let removeListeners: (() => void) | undefined;

    void (async () => {
      await setupAndroidChannels();
      await ensureNotificationPermissions();
      await ensureWaterRemindersSchedule();
      await ensureUvDigestSchedule();
      removeListeners = registerInboxFromNotifications();
    })();

    return () => {
      removeListeners?.();
    };
  }, []);

  return null;
}
