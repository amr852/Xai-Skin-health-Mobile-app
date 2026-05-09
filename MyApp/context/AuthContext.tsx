import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { clearInbox } from '@/lib/notificationInbox';
import {
  clearAuthStorage,
  getAccessToken,
  getUserJson,
  hydrateNativeAsyncAuthCache,
  migrateLegacyAuthFromAsyncStorage,
  setTokenPair,
  setUserJson,
} from '@/lib/authStorage';
import { apiFetch, ApiError, registerAuthListeners } from '@/lib/api';

type User = {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  dateOfBirth: string;
};

type AuthResult = { success: boolean; error?: string };

type AuthResponse = { token: string; refreshToken: string; user: User };

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    gender: 'male' | 'female',
    dateOfBirth: string
  ) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export async function getStoredToken(): Promise<string | null> {
  return getAccessToken();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await hydrateNativeAsyncAuthCache();
        await migrateLegacyAuthFromAsyncStorage();
        const savedToken = getAccessToken();
        const savedUser = getUserJson();
        if (alive && savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser) as User);
        }
      } catch (e) {
        console.warn('[auth] failed to restore session', e);
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    registerAuthListeners(
      (access, _refresh) => {
        setToken(access);
      },
      () => {
        setToken(null);
        setUser(null);
      },
    );
    return () => registerAuthListeners(null, null);
  }, []);

  const persist = (access: string, refresh: string, u: User) => {
    setTokenPair(access, refresh);
    setUserJson(JSON.stringify(u));
    setToken(access);
    setUser(u);
  };

  const friendlyError = (err: unknown, fallback: string): string => {
    if (err instanceof ApiError) {
      if (err.status === 0) return err.message; // network/timeout
      if (err.status === 401) return 'Invalid email or password.';
      return err.message || fallback;
    }
    return (err as any)?.message || fallback;
  };

  const register = useCallback(async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    gender: 'male' | 'female',
    dateOfBirth: string,
  ): Promise<AuthResult> => {
    setError(null);
    try {
      const data = await apiFetch<AuthResponse>('/users/register', {
        method: 'POST',
        json: { email, password, firstName, lastName, gender, dateOfBirth },
      });
      persist(data.token, data.refreshToken, data.user);
      return { success: true };
    } catch (err) {
      const msg = friendlyError(err, 'Registration failed.');
      setError(msg);
      return { success: false, error: msg };
    }
  }, []);

  const login = useCallback(async (
    email: string,
    password: string,
  ): Promise<AuthResult> => {
    setError(null);
    try {
      const data = await apiFetch<AuthResponse>('/users/login', {
        method: 'POST',
        json: { email, password },
      });
      persist(data.token, data.refreshToken, data.user);
      return { success: true };
    } catch (err) {
      const msg = friendlyError(err, 'Login failed.');
      setError(msg);
      return { success: false, error: msg };
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      const access = getAccessToken();
      if (access) {
        try {
          await apiFetch('/users/logout', { method: 'POST' });
        } catch {
          /* still clear locally */
        }
      }
      await clearInbox();
      clearAuthStorage();
      setToken(null);
      setUser(null);
      setError(null);
    } catch (err) {
      console.warn('[auth] logout error', err);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, error, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
