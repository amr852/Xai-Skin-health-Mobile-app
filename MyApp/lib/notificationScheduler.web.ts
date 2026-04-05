/** Web: Metro does not bundle `expo-notifications` — stubs keep the app compiling. */

export function notificationsNativeSupported(): boolean {
  return false;
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  return false;
}

export async function setupAndroidChannels(): Promise<void> {}

export function setNotificationPresentationDefaults(): void {}

export async function cancelByIds(_ids: readonly string[]): Promise<void> {}

export async function syncWaterReminders(_waterLiters: number): Promise<void> {
  void _waterLiters;
}

export async function ensureWaterRemindersSchedule(): Promise<void> {}

export async function ensureUvDigestSchedule(): Promise<void> {}

export function registerInboxFromNotifications(): () => void {
  return () => {};
}
