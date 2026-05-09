function withApiOrigin(pathnameWithQuery: string, apiBaseUrl: string): string {
  try {
    return new URL(pathnameWithQuery, apiBaseUrl).toString();
  } catch {
    return pathnameWithQuery;
  }
}

/**
 * Rewrites media URLs emitted by the API so they are reachable on device:
 * - `/uploads/x.png` -> `${apiBase}/uploads/x.png`
 * - `http://localhost:3000/uploads/x.png` -> `${apiBaseOrigin}/uploads/x.png`
 * - `http://127.0.0.1:3000/...` and Android emulator loopback follow same rule.
 */
export function normalizeApiMediaUrl(
  value: string | null | undefined,
  apiBaseUrl: string,
): string | undefined {
  if (!value || typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith('/')) {
    return withApiOrigin(trimmed, apiBaseUrl);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return trimmed;
  }

  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '10.0.2.2') {
    return withApiOrigin(`${parsed.pathname}${parsed.search}${parsed.hash}`, apiBaseUrl);
  }

  return parsed.toString();
}
