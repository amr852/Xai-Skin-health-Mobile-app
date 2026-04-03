import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@skinhealth/inbox_v1';
const MAX_ITEMS = 80;

export type InboxItemKind = 'water' | 'uv' | 'system';

export type InboxItem = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: number;
  kind: InboxItemKind;
};

type InboxListener = () => void;
const inboxListeners = new Set<InboxListener>();

export function subscribeInboxChange(fn: InboxListener): () => void {
  inboxListeners.add(fn);
  return () => inboxListeners.delete(fn);
}

function emitInboxChange() {
  inboxListeners.forEach(fn => fn());
}

export async function loadInbox(): Promise<InboxItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as InboxItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveInbox(items: InboxItem[]): Promise<void> {
  const trimmed = items.slice(0, MAX_ITEMS);
  await AsyncStorage.setItem(KEY, JSON.stringify(trimmed));
  emitInboxChange();
}

export async function appendInboxItem(input: {
  title: string;
  body: string;
  kind: InboxItemKind;
  read?: boolean;
  /** Skip 5s dedupe (same title+body) for manual entries */
  force?: boolean;
}): Promise<void> {
  const items = await loadInbox();
  const now = Date.now();
  if (!input.force) {
    const dup = items.find(
      i =>
        i.title === input.title &&
        i.body === input.body &&
        now - i.createdAt < 5000,
    );
    if (dup) return;
  }
  const item: InboxItem = {
    id: `${now}-${Math.random().toString(36).slice(2, 9)}`,
    title: input.title,
    body: input.body,
    read: input.read ?? false,
    createdAt: now,
    kind: input.kind,
  };
  await saveInbox([item, ...items]);
}

export async function markInboxItemRead(id: string): Promise<void> {
  const items = await loadInbox();
  const next = items.map(it => (it.id === id ? { ...it, read: true } : it));
  await saveInbox(next);
}

export async function markAllInboxRead(): Promise<void> {
  const items = await loadInbox();
  await saveInbox(items.map(it => ({ ...it, read: true })));
}

export function countUnread(items: InboxItem[]): number {
  return items.filter(i => !i.read).length;
}
