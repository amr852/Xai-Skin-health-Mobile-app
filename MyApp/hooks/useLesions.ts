import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { apiFetch, ApiError, API_URL } from '@/lib/api';
import { getStoredToken } from '@/context/AuthContext';

export type TopPrediction = { label: string; score: number };

export type LesionAnalysis = {
  label: string;
  score: number;
  camImageUrl?: string;
  imageUrl: string;
  modelName?: string;
  predictionIndex?: number;
  xaiMethod?: string;
  enhancementsApplied?: string[];
  topPredictions?: TopPrediction[];
  recordId?: string | null;
};

export type Lesion = {
  _id: string;
  title: string;
  description: string;
  location: string;
  createdAt: string;
  status: 'Stable' | 'Check' | 'Urgent';
  imageUrl?: string;
  notes?: string;
  analysis?: Omit<LesionAnalysis, 'imageUrl'> & { camImageUrl?: string };
};

export type LesionFields = {
  title: string;
  description: string;
  location: string;
  status: 'Stable' | 'Check' | 'Urgent';
  notes: string;
};

async function clearAuthOnUnauthorized() {
  await AsyncStorage.multiRemove(['authToken', 'authUser']);
}

export function useLesions() {
  const [lesions, setLesions] = useState<Lesion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLesions = useCallback(async () => {
    const token = await getStoredToken();
    if (!token) { setLesions([]); setError(null); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Lesion[]>('/lesions', { token });
      if (!Array.isArray(data)) throw new ApiError(500, 'Unexpected response from server');
      setLesions(data);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await clearAuthOnUnauthorized();
        setLesions([]);
        setError(null);
      } else {
        setError((e as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Image upload uses raw FormData so multipart is preserved — done via fetch directly.
  const uploadImage = useCallback(async (uri: string): Promise<string> => {
    const token = await getStoredToken();
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
    const text = await res.text();
    let body: any;
    try { body = text ? JSON.parse(text) : {}; } catch { body = {}; }
    if (!res.ok) throw new ApiError(res.status, body?.error || 'Image upload failed', body);
    return body.url as string;
  }, []);

  const analyzeImage = useCallback(async (uri: string): Promise<LesionAnalysis> => {
    const token = await getStoredToken();
    const formData = new FormData();
    formData.append('image', {
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      type: 'image/jpeg',
      name: 'lesion.jpg',
    } as any);

    const res = await fetch(`${API_URL}/lesions/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const text = await res.text();
    let body: any;
    try { body = text ? JSON.parse(text) : {}; } catch { body = {}; }
    if (!res.ok) throw new ApiError(res.status, body?.error || 'Analysis failed', body);

    if (!body.imageUrl || !body.analysis) {
      throw new ApiError(500, 'Unexpected analysis response');
    }

    return {
      ...body.analysis,
      imageUrl: body.imageUrl,
    } as LesionAnalysis;
  }, []);

  const addLesion = useCallback(
    async (fields: LesionFields, imageUri?: string, analysis?: LesionAnalysis): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const token = await getStoredToken();
        let imageUrl: string | undefined = analysis?.imageUrl;
        if (imageUri && !imageUrl) {
          try { imageUrl = await uploadImage(imageUri); } catch { /* non-fatal — save record without image */ }
        }

        await apiFetch<Lesion>('/lesions', {
          method: 'POST',
          token,
          json: { ...fields, imageUrl, analysis },
        });
      } catch (e) {
        setError((e as Error).message);
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
        const token = await getStoredToken();
        let imageUrl: string | undefined;
        if (imageUri) {
          try { imageUrl = await uploadImage(imageUri); } catch { /* non-fatal */ }
        }
        await apiFetch(`/lesions/${id}`, {
          method: 'PUT',
          token,
          json: { ...fields, ...(imageUrl ? { imageUrl } : {}) },
        });
        setLesions(prev =>
          prev.map(l => (l._id === id ? { ...l, ...fields, ...(imageUrl ? { imageUrl } : {}) } : l)),
        );
      } catch (e) {
        setError((e as Error).message);
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
      const token = await getStoredToken();
      await apiFetch(`/lesions/${id}`, { method: 'DELETE', token });
      setLesions(prev => prev.filter(l => l._id !== id));
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { lesions, loading, error, fetchLesions, addLesion, analyzeImage, updateLesion, deleteLesion };
}
