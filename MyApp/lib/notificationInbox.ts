// lib/notificationInbox.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export type InboxItem = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

// ← Get the current user's ID from storage
async function getUserKey(): Promise<string> {
  const raw = await AsyncStorage.getItem('authUser');
  if (!raw) return 'guest';
  const user = JSON.parse(raw);
  return user._id ?? user.id ?? 'guest';
}

async function getInboxKey(): Promise<string> {
  const uid = await getUserKey();
  return `inbox:${uid}`;  // e.g. "inbox:64abc123..."
}

export async function loadInbox(): Promise<InboxItem[]> {
  try {
    const key = await getInboxKey();
    const raw = await AsyncStorage.getItem(key);
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
    const key = await getInboxKey();
    const existing = await loadInbox();
    const updated = [{ ...item, read: false }, ...existing];
    await AsyncStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.warn('saveInboxItem error', e);
  }
}

export async function markInboxItemRead(id: string): Promise<void> {
  try {
    const key = await getInboxKey();
    const existing = await loadInbox();
    const updated = existing.map(i => (i.id === id ? { ...i, read: true } : i));
    await AsyncStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.warn('markInboxItemRead error', e);
  }
}

export async function markAllInboxRead(): Promise<void> {
  try {
    const key = await getInboxKey();
    const existing = await loadInbox();
    const updated = existing.map(i => ({ ...i, read: true }));
    await AsyncStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.warn('markAllInboxRead error', e);
  }
}

export async function clearInbox(): Promise<void> {
  try {
    const key = await getInboxKey();
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.warn('clearInbox error', e);
  }
}
// Add these two exports to the bottom of lib/notificationInbox.ts

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