import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS = 'accessToken';
const REFRESH = 'refreshToken';
const USER = 'authUser';

const LEGACY_TOKEN_KEY = 'authToken';
const LEGACY_USER_KEY = 'authUser';

type MMKVType = import('react-native-mmkv').MMKV;

let mmkv: MMKVType | null = null;

if (Platform.OS !== 'web') {
  try {
    const { MMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
    mmkv = new MMKV({ id: 'auth' });
  } catch {
    mmkv = null;
  }
}

/** In-memory mirror for native when MMKV is unavailable (e.g. Expo Go). */
const asyncMirror = {
  access: null as string | null,
  refresh: null as string | null,
  user: null as string | null,
};

/** Load tokens from AsyncStorage into memory before first sync read (native, no MMKV). */
export async function hydrateNativeAsyncAuthCache(): Promise<void> {
  if (Platform.OS === 'web' || mmkv) return;
  try {
    const pairs = await AsyncStorage.multiGet([ACCESS, REFRESH, USER]);
    asyncMirror.access = pairs[0][1];
    asyncMirror.refresh = pairs[1][1];
    asyncMirror.user = pairs[2][1];
  } catch (e) {
    console.warn('[authStorage] hydrate failed', e);
  }
}

function webGet(key: string): string | null {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return null;
  return localStorage.getItem(key);
}

function webSet(key: string, value: string) {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  }
}

function webRemove(key: string) {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.removeItem(key);
  }
}

export function getAccessToken(): string | null {
  if (mmkv) return mmkv.getString(ACCESS) ?? null;
  if (Platform.OS === 'web') return webGet(ACCESS);
  return asyncMirror.access;
}

export function getRefreshToken(): string | null {
  if (mmkv) return mmkv.getString(REFRESH) ?? null;
  if (Platform.OS === 'web') return webGet(REFRESH);
  return asyncMirror.refresh;
}

export function setTokenPair(access: string, refresh: string) {
  if (mmkv) {
    mmkv.set(ACCESS, access);
    mmkv.set(REFRESH, refresh);
  } else if (Platform.OS === 'web') {
    webSet(ACCESS, access);
    webSet(REFRESH, refresh);
  } else {
    asyncMirror.access = access;
    asyncMirror.refresh = refresh;
    void AsyncStorage.multiSet([
      [ACCESS, access],
      [REFRESH, refresh],
    ]);
  }
}

export function setAccessTokenOnly(access: string) {
  if (mmkv) mmkv.set(ACCESS, access);
  else if (Platform.OS === 'web') webSet(ACCESS, access);
  else {
    asyncMirror.access = access;
    void AsyncStorage.setItem(ACCESS, access);
  }
}

export function setUserJson(json: string) {
  if (mmkv) mmkv.set(USER, json);
  else if (Platform.OS === 'web') webSet(USER, json);
  else {
    asyncMirror.user = json;
    void AsyncStorage.setItem(USER, json);
  }
}

export function getUserJson(): string | null {
  if (mmkv) return mmkv.getString(USER) ?? null;
  if (Platform.OS === 'web') return webGet(USER);
  return asyncMirror.user;
}

export function clearAuthStorage() {
  if (mmkv) {
    mmkv.delete(ACCESS);
    mmkv.delete(REFRESH);
    mmkv.delete(USER);
  } else if (Platform.OS === 'web') {
    webRemove(ACCESS);
    webRemove(REFRESH);
    webRemove(USER);
  } else {
    asyncMirror.access = null;
    asyncMirror.refresh = null;
    asyncMirror.user = null;
    void AsyncStorage.multiRemove([ACCESS, REFRESH, USER]);
  }
}

/** One-time copy from AsyncStorage keys used before MMKV. */
export async function migrateLegacyAuthFromAsyncStorage(): Promise<void> {
  try {
    const pairs = await AsyncStorage.multiGet([LEGACY_TOKEN_KEY, LEGACY_USER_KEY]);
    const legacyToken = pairs[0][1];
    const legacyUser = pairs[1][1];
    if (!legacyToken || getAccessToken()) {
      return;
    }
    setAccessTokenOnly(legacyToken);
    if (legacyUser) setUserJson(legacyUser);
    await AsyncStorage.multiRemove([LEGACY_TOKEN_KEY, LEGACY_USER_KEY]);
  } catch (e) {
    console.warn('[authStorage] legacy migrate failed', e);
  }
}
