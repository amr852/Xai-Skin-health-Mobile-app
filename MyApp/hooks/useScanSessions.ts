import { useState, useCallback } from 'react';
import { apiFetch, ApiError, invalidateLocalSession } from '@/lib/api';
import { getStoredToken } from '@/context/AuthContext';
import type { LesionBbox } from '@/lib/bboxLayout';

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
  lesions: ScanSessionLesionStored[];
  createdAt: string;
};

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
      setSessions(data);
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

  return { sessions, loading, error, fetchSessions };
}

export async function fetchScanSessionById(id: string): Promise<ScanSession> {
  const safe = encodeURIComponent(id);
  return apiFetch<ScanSession>(`/scan-sessions/${safe}`);
}
