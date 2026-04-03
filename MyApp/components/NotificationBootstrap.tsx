import { useEffect } from 'react';
import {
  ensureNotificationPermissions,
  ensureUvDigestSchedule,
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
      await ensureUvDigestSchedule();
      removeListeners = registerInboxFromNotifications();
    })();

    return () => {
      removeListeners?.();
    };
  }, []);

  return null;
}
