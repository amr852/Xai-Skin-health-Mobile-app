import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { clearInbox } from '@/lib/notificationInbox';

const API_URL = Platform.OS === 'web'
  ? 'http://localhost:3000'
  : 'http://192.168.1.5:3000';

type User = {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  dateOfBirth: string;
};

type AuthResult = { success: boolean; error?: string };

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const savedToken = await AsyncStorage.getItem('authToken');
        const savedUser = await AsyncStorage.getItem('authUser');
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch (e) {
        console.log('Failed to restore token', e);
      } finally {
        setIsLoading(false);
      }
    };
    bootstrapAsync();
  }, []);

  const register = useCallback(async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    gender: 'male' | 'female',
    dateOfBirth: string
  ): Promise<AuthResult> => {
    setError(null);
    try {
      const response = await fetch(`${API_URL}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName, gender, dateOfBirth }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registration failed');

      await AsyncStorage.setItem('authToken', data.token);
      await AsyncStorage.setItem('authUser', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.message || 'Registration failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const login = useCallback(async (
    email: string,
    password: string
  ): Promise<AuthResult> => {
    setError(null);
    try {
      const response = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');

      await AsyncStorage.setItem('authToken', data.token);
      await AsyncStorage.setItem('authUser', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

// In AuthContext.tsx, inside the logout function:
const logout = useCallback(async (): Promise<void> => {
  try {
    await clearInbox();
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('authUser');
    console.log('Token cleared, setting null...');
    setToken(null);
    setUser(null);
    setError(null);
    console.log('State set to null');
  } catch (err) {
    console.log('Logout error:', err);
  }
}, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, error, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}