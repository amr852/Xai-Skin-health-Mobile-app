import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_URL = Platform.OS === 'web'
  ? 'http://localhost:3000'
  : 'http://192.168.1.5:3000';

export type Lesion = {
  _id: string;
  title: string;
  description: string;
  location: string;
  createdAt: string;
  status: 'Stable' | 'Check' | 'Urgent';
  imageUrl?: string;
  notes?: string;
};

export type LesionFields = {
  title: string;
  description: string;
  location: string;
  status: 'Stable' | 'Check' | 'Urgent';
  notes: string;
};

// Moved outside hook so it is stable and reusable
async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Server error (${res.status}): ${text.slice(0, 120) || res.statusText}`,
    );
  }
}

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem('authToken');
}

export function useLesions() {
  const [lesions, setLesions] = useState<Lesion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLesions = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setLesions([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/lesions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        await AsyncStorage.multiRemove(['authToken', 'authUser']);
        setLesions([]);
        setError(null);
        return;
      }
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Failed to fetch lesions');
      if (!Array.isArray(data)) throw new Error('Unexpected response from server');
      setLesions(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadImage = useCallback(async (uri: string): Promise<string> => {
    const token = await getToken();
    const formData = new FormData();
    formData.append('image', {
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      type: 'image/jpeg',
      name: 'lesion.jpg',
    } as any);
    const res = await fetch(`${API_URL}/lesions/upload-image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Image upload failed');
    return data.url as string;
  }, []);

  const addLesion = useCallback(
    async (fields: LesionFields, imageUri?: string): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        let imageUrl: string | undefined;
        if (imageUri) {
          try { imageUrl = await uploadImage(imageUri); } catch { /* non-fatal */ }
        }
        const res = await fetch(`${API_URL}/lesions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...fields, imageUrl }),
        });
        const data = await safeJson(res);
        if (!res.ok) throw new Error(data.error || 'Failed to save lesion');
      } catch (e: any) {
        setError(e.message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [uploadImage],
  );

  const updateLesion = useCallback(
    async (id: string, fields: LesionFields, imageUri?: string): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        let imageUrl: string | undefined;
        if (imageUri) {
          try { imageUrl = await uploadImage(imageUri); } catch { /* non-fatal */ }
        }
        const res = await fetch(`${API_URL}/lesions/${id}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...fields, ...(imageUrl ? { imageUrl } : {}) }),
        });
        const data = await safeJson(res);
        if (!res.ok) throw new Error(data.error || 'Failed to update lesion');
        // Update local state immediately
        setLesions(prev =>
          prev.map(l => (l._id === id ? { ...l, ...fields, ...(imageUrl ? { imageUrl } : {}) } : l)),
        );
      } catch (e: any) {
        setError(e.message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [uploadImage],
  );

  const deleteLesion = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/lesions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Failed to delete lesion');
      setLesions(prev => prev.filter(l => l._id !== id));
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { lesions, loading, error, fetchLesions, addLesion, updateLesion, deleteLesion };
}
