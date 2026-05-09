import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { apiFetch, apiFetchFormData, ApiError, invalidateLocalSession } from '@/lib/api';
import { getStoredToken } from '@/context/AuthContext';
import type { LesionBbox } from '@/lib/bboxLayout';

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
  severity?: string;
  bbox?: LesionBbox;
};

export type LesionDetection = {
  lesion_id?: string;
  bbox: LesionBbox;
  severity?: string;
  diagnosis?: { label: string; score: number };
};

export type AnalyzeImageResult = LesionAnalysis & {
  lesions?: LesionDetection[];
  lesionCount?: number;
  noLesionFound?: boolean;
  partialFailure?: boolean;
  sessionId?: string | null;
};

export type StoredLesionFinding = {
  lesion_id?: string;
  bbox: LesionBbox;
  severity?: string;
  diagnosis?: { label: string; score: number };
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
  analysis?: Omit<LesionAnalysis, 'imageUrl'> & {
    camImageUrl?: string;
    lesions?: StoredLesionFinding[];
    lesionCount?: number;
    noLesionFound?: boolean;
    partialFailure?: boolean;
    sessionId?: string | null;
  };
};

export type LesionFields = {
  title: string;
  description: string;
  location: string;
  status: 'Stable' | 'Check' | 'Urgent';
  notes: string;
};

/** Optional multipart metadata for library picks (PNG/WebP, original filename). */
export type LesionImageUploadOptions = {
  mimeType?: string;
  fileName?: string;
  /** Passed to the model server (`camera` runs quality enhancement; `gallery` skips it). */
  source?: 'camera' | 'gallery';
};

const ANALYZE_UPLOAD_TIMEOUT_MS = 130_000;

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
      const data = await apiFetch<Lesion[]>('/lesions');
      if (!Array.isArray(data)) throw new ApiError(500, 'Unexpected response from server');
      setLesions(data);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        invalidateLocalSession();
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
  const uploadImage = useCallback(async (uri: string, options?: LesionImageUploadOptions): Promise<string> => {
    const token = await getStoredToken();
    if (!token) {
      throw new ApiError(401, 'Not signed in. Please log in again.');
    }
    const mime = options?.mimeType?.trim() || 'image/jpeg';
    const name = options?.fileName?.trim() || 'lesion.jpg';
    const formData = new FormData();
    formData.append('image', {
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      type: mime,
      name,
    } as any);
    const body = await apiFetchFormData<{ url: string }>(
      '/lesions/upload-image',
      formData,
      { timeoutMs: ANALYZE_UPLOAD_TIMEOUT_MS },
    );
    if (!body?.url) throw new ApiError(500, 'Upload response missing url', body);
    return body.url as string;
  }, []);

  const analyzeImage = useCallback(async (uri: string, options?: LesionImageUploadOptions): Promise<AnalyzeImageResult> => {
    const token = await getStoredToken();
    if (!token) {
      throw new ApiError(401, 'Not signed in. Please log in again.');
    }
    const mime = options?.mimeType?.trim() || 'image/jpeg';
    const name = options?.fileName?.trim() || 'lesion.jpg';
    const formData = new FormData();
    formData.append('image', {
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      type: mime,
      name,
    } as any);
    const src = options?.source === 'gallery' ? 'gallery' : 'camera';
    formData.append('source', src);

    let body: {
      imageUrl?: string;
      analysis?: Record<string, unknown>;
      lesions?: LesionDetection[];
      lesionCount?: number;
      noLesionFound?: boolean;
      partialFailure?: boolean;
      sessionId?: string | null;
    };
    try {
      body = await apiFetchFormData<typeof body>(
        '/lesions/analyze',
        formData,
        { timeoutMs: ANALYZE_UPLOAD_TIMEOUT_MS },
      );
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 0) {
        throw new ApiError(0, e.message || 'Unable to reach the analysis server.');
      }
      throw e;
    }

    if (!body.imageUrl || !body.analysis) {
      throw new ApiError(500, 'Unexpected analysis response');
    }

    return {
      ...body.analysis,
      imageUrl: body.imageUrl,
      lesions: body.lesions,
      lesionCount: body.lesionCount,
      noLesionFound: body.noLesionFound,
      partialFailure: body.partialFailure,
      sessionId: body.sessionId,
    } as AnalyzeImageResult;
  }, []);

  const addLesion = useCallback(
    async (fields: LesionFields, imageUri?: string, analysis?: LesionAnalysis | AnalyzeImageResult): Promise<void> => {
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
      await apiFetch(`/lesions/${id}`, { method: 'DELETE' });
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
