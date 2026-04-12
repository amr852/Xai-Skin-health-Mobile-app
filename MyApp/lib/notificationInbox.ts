// lib/notificationInbox.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const INBOX_KEY = '@skinhealth/inbox';
// Must match the key used in uvInboxNotify.ts — cleared together so UV items
// regenerate after logout (the sig would otherwise block re-writing).
const UV_SIG_KEY = '@skinhealth/last_uv_inbox_sig';

export type InboxItem = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export async function loadInbox(): Promise<InboxItem[]> {
  try {
    const raw = await AsyncStorage.getItem(INBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as InboxItem[];
    return parsed.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

export async function saveInboxItem(item: Omit<InboxItem, 'read'>): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(INBOX_KEY);
    const existing: InboxItem[] = raw ? JSON.parse(raw) : [];
    // Skip if an item with this ID already exists (prevents duplicates)
    if (existing.some(i => i.id === item.id)) return;
    const updated = [{ ...item, read: false }, ...existing];
    await AsyncStorage.setItem(INBOX_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('saveInboxItem error', e);
  }
}

export async function markInboxItemRead(id: string): Promise<void> {
  try {
    const items = await loadInbox();
    const updated = items.map(i => (i.id === id ? { ...i, read: true } : i));
    await AsyncStorage.setItem(INBOX_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('markInboxItemRead error', e);
  }
}

export async function markAllInboxRead(): Promise<void> {
  try {
    const items = await loadInbox();
    const updated = items.map(i => ({ ...i, read: true }));
    await AsyncStorage.setItem(INBOX_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('markAllInboxRead error', e);
  }
}

export async function clearInbox(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([INBOX_KEY, UV_SIG_KEY]);
  } catch (e) {
    console.warn('clearInbox error', e);
  }
}

export async function countUnread(): Promise<number> {
  try {
    const items = await loadInbox();
    return items.filter(i => !i.read).length;
  } catch {
    return 0;
  }
}

// Polls for changes and calls the callback whenever inbox updates
export function subscribeInboxChange(callback: () => void): () => void {
  const interval = setInterval(() => {
    callback();
  }, 5000); // checks every 5 seconds

  // Call immediately on subscribe
  callback();

  return () => clearInterval(interval);
}
