import { useState, useCallback } from 'react';
import { API_URL, apiFetch, ApiError, invalidateLocalSession } from '@/lib/api';
import { getStoredToken } from '@/context/AuthContext';
import type { LesionBbox } from '@/lib/bboxLayout';
import { normalizeApiMediaUrl } from '@/lib/mediaUrl';

export type ScanSessionDiagnosis = {
  label?: string;
  score?: number;
  top_k?: { label: string; score: number }[];
};

export type ScanSessionLesionStored = {
  lesionId: string;
  bbox?: LesionBbox;
  diagnosis?: ScanSessionDiagnosis;
  severity?: 'urgent' | 'check' | 'stable';
  cropImageUrl?: string;
  overlayImageUrl?: string;
};

/** Document shape from GET /scan-sessions (Mongoose lean → JSON). */
export type ScanSession = {
  _id: string;
  userId: string;
  flaskSessionId?: string | null;
  lesionCount: number;
  noLesionFound: boolean;
  partialFailure: boolean;
  qualityMetadata?: { enhancements_applied?: string[] };
  originalImageUrl?: string;
  annotatedImageUrl?: string | null;
  /** User-editable metadata (added via PATCH /scan-sessions/:id). */
  title?: string;
  description?: string;
  location?: string;
  notes?: string;
  lesions: ScanSessionLesionStored[];
  createdAt: string;
};

/** Editable fields a user can supply for a scan via the EditScanModal. */
export type ScanSessionFields = {
  title?: string;
  description?: string;
  location?: string;
  notes?: string;
};

function normalizeScanSessionMedia(session: ScanSession): ScanSession {
  return {
    ...session,
    originalImageUrl: normalizeApiMediaUrl(session.originalImageUrl, API_URL),
    annotatedImageUrl:
      normalizeApiMediaUrl(session.annotatedImageUrl, API_URL) ?? session.annotatedImageUrl ?? null,
    lesions: Array.isArray(session.lesions)
      ? session.lesions.map((lesion) => ({
          ...lesion,
          cropImageUrl: normalizeApiMediaUrl(lesion.cropImageUrl, API_URL),
          overlayImageUrl: normalizeApiMediaUrl(lesion.overlayImageUrl, API_URL),
        }))
      : [],
  };
}

export function useScanSessions() {
  const [sessions, setSessions] = useState<ScanSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    const token = await getStoredToken();
    if (!token) {
      setSessions([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ScanSession[]>('/scan-sessions');
      if (!Array.isArray(data)) throw new ApiError(500, 'Unexpected scan-sessions response');
      setSessions(data.map((item) => normalizeScanSessionMedia(item)));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        invalidateLocalSession();
        setSessions([]);
        setError(null);
      } else {
        setError((e as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSession = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/scan-sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s._id !== id));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        // If the session is already gone server-side, keep client state in sync.
        setSessions((prev) => prev.filter((s) => s._id !== id));
        return;
      }
      setError((e as Error).message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSession = useCallback(
    async (id: string, fields: ScanSessionFields): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const updated = await apiFetch<ScanSession>(
          `/scan-sessions/${encodeURIComponent(id)}`,
          { method: 'PATCH', json: fields },
        );
        const normalized = normalizeScanSessionMedia(updated);
        setSessions((prev) => prev.map((s) => (s._id === id ? { ...s, ...normalized } : s)));
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { sessions, loading, error, fetchSessions, deleteSession, updateSession };
}

export async function fetchScanSessionById(id: string): Promise<ScanSession> {
  const safe = encodeURIComponent(id);
  const session = await apiFetch<ScanSession>(`/scan-sessions/${safe}`);
  return normalizeScanSessionMedia(session);
}
