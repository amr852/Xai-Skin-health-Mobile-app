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
  diagnosis?: {
    label: string;
    score: number;
    top_k?: { label: string; score: number }[];
  };
  cropUrl?: string | null;
  overlayUrl?: string | null;
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

    type ScanSessionCreateBody = {
      _id: string;
      session_id?: string | null;
      nodeSessionId?: string;
      lesion_count: number;
      no_lesion_found: boolean;
      partial_failure: boolean;
      annotatedImageUrl?: string | null;
      originalImageUrl?: string;
      quality_metadata?: { enhancements_applied?: string[] };
      lesions: Array<{
        lesion_id: string;
        bbox?: LesionDetection['bbox'];
        severity?: string;
        diagnosis?: { label?: string; score?: number; top_k?: { label: string; score: number }[] };
        cropUrl?: string | null;
        overlayUrl?: string | null;
      }>;
    };

    let body: ScanSessionCreateBody;
    try {
      body = await apiFetchFormData<ScanSessionCreateBody>(
        '/scan-sessions',
        formData,
        { timeoutMs: ANALYZE_UPLOAD_TIMEOUT_MS },
      );
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 0) {
        throw new ApiError(0, e.message || 'Unable to reach the analysis server.');
      }
      throw e;
    }

    if (!body.originalImageUrl) {
      throw new ApiError(500, 'Unexpected scan session response');
    }

    const enhancementsApplied = Array.isArray(body.quality_metadata?.enhancements_applied)
      ? body.quality_metadata!.enhancements_applied!
      : [];

    const first = body.lesions?.[0];
    let analysis: Omit<LesionAnalysis, 'imageUrl'>;
    if (first) {
      analysis = {
        label: first.diagnosis?.label ?? '—',
        score: typeof first.diagnosis?.score === 'number' ? first.diagnosis.score : 0,
        camImageUrl: body.annotatedImageUrl || first.overlayUrl || undefined,
        modelName: 'resnet50 + YOLO (Grad-CAM)',
        predictionIndex: undefined,
        xaiMethod: 'Grad-CAM',
        enhancementsApplied,
        topPredictions: Array.isArray(first.diagnosis?.top_k) ? first.diagnosis!.top_k! : [],
        recordId: body.session_id || null,
        severity: first.severity,
        bbox: first.bbox,
      };
    } else if (body.no_lesion_found) {
      analysis = {
        label: 'No lesion detected',
        score: 0,
        camImageUrl: body.annotatedImageUrl || undefined,
        modelName: 'resnet50 + YOLO (Grad-CAM)',
        predictionIndex: undefined,
        xaiMethod: 'Grad-CAM',
        enhancementsApplied,
        topPredictions: [],
        recordId: body.session_id || null,
      };
    } else {
      analysis = {
        label: body.partial_failure ? 'Detection without classification' : 'Analysis unavailable',
        score: 0,
        camImageUrl: body.annotatedImageUrl || undefined,
        modelName: 'resnet50 + YOLO (Grad-CAM)',
        predictionIndex: undefined,
        xaiMethod: 'Grad-CAM',
        enhancementsApplied,
        topPredictions: [],
        recordId: body.session_id || null,
      };
    }

    const lesionsSummary: LesionDetection[] = Array.isArray(body.lesions)
      ? body.lesions
          .filter((L): L is typeof L & { bbox: NonNullable<typeof L.bbox> } => L.bbox != null)
          .map((L) => ({
            lesion_id: L.lesion_id,
            bbox: L.bbox,
            severity: L.severity,
            cropUrl: L.cropUrl ?? null,
            overlayUrl: L.overlayUrl ?? null,
            diagnosis: L.diagnosis
              ? {
                  label: L.diagnosis.label ?? '—',
                  score: L.diagnosis.score ?? 0,
                  top_k: Array.isArray(L.diagnosis.top_k) ? L.diagnosis.top_k : undefined,
                }
              : undefined,
          }))
      : [];

    return {
      ...analysis,
      imageUrl: body.originalImageUrl,
      lesions: lesionsSummary.filter((x) => x.bbox),
      lesionCount: body.lesion_count,
      noLesionFound: !!body.no_lesion_found,
      partialFailure: !!body.partial_failure,
      sessionId: body.nodeSessionId ?? String(body._id),
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
