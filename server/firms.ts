/**
 * Server-side proxy for NASA FIRMS near-real-time hotspots.
 *
 * The FIRMS MAP_KEY is read from the server environment (FIRMS_MAP_KEY in .env.local) and is
 * never sent to the browser: the client calls `/api/firms`, this handler calls FIRMS. It is
 * wired into the Vite dev and preview servers (see vite.config.ts) and is framework-neutral, so
 * the same function can back a serverless endpoint when the app is deployed.
 *
 * FIRMS area API: https://firms.modaps.eosdis.nasa.gov/api/area/
 */

import type { FirmsProxyBody, FirmsSourceName, FirmsSourceResult } from '../src/lib/firms';

export const FIRMS_SOURCES: readonly FirmsSourceName[] = ['VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT', 'VIIRS_NOAA21_NRT', 'MODIS_NRT'];

/** West, south, east, north — India including J&K and Ladakh, plus a small margin. */
export const INDIA_BBOX = '68,6,98,37.5';

export interface ProxyResponse {
  status: number;
  body: FirmsProxyBody | { error: string; message: string };
}

const CACHE_MS = 10 * 60 * 1000;
let cache: { key: string; expiresAt: number; response: ProxyResponse } | null = null;

const FIRMS_KEY_PATTERN = /^[A-Za-z0-9]{20,64}$/;

export async function handleFirmsRequest(
  url: URL,
  mapKey: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<ProxyResponse> {
  if (!mapKey) {
    return {
      status: 503,
      body: {
        error: 'not_configured',
        message: 'Live feed is not configured. Add FIRMS_MAP_KEY to .env.local and restart the server.',
      },
    };
  }
  if (!FIRMS_KEY_PATTERN.test(mapKey)) {
    return { status: 503, body: { error: 'invalid_key_format', message: 'FIRMS_MAP_KEY does not look like a FIRMS MAP_KEY.' } };
  }

  const days = Math.min(5, Math.max(1, Number.parseInt(url.searchParams.get('days') ?? '1', 10) || 1));
  const cacheKey = `${days}`;
  if (cache && cache.key === cacheKey && cache.expiresAt > Date.now()) return cache.response;

  const results = await Promise.all(
    FIRMS_SOURCES.map(async (source): Promise<FirmsSourceResult> => {
      const endpoint = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(mapKey)}/${source}/${INDIA_BBOX}/${days}`;
      try {
        const res = await fetchImpl(endpoint, { signal: AbortSignal.timeout(20_000) });
        const text = await res.text();
        // FIRMS reports some errors (e.g. an invalid key) as plain text rather than CSV.
        if (!res.ok || !text.startsWith('latitude,')) {
          return { source, ok: false, error: sanitise(text, mapKey) || `HTTP ${res.status}` };
        }
        return { source, ok: true, csv: text };
      } catch (e) {
        return { source, ok: false, error: sanitise(e instanceof Error ? e.message : String(e), mapKey) };
      }
    }),
  );

  const response: ProxyResponse = {
    status: results.some((r) => r.ok) ? 200 : 502,
    body: { fetchedAt: new Date().toISOString(), days, bbox: INDIA_BBOX, results },
  };
  if (response.status === 200) cache = { key: cacheKey, expiresAt: Date.now() + CACHE_MS, response };
  return response;
}

/** Keep upstream error text short and never echo the key back. */
function sanitise(text: string, mapKey: string): string {
  return text.replaceAll(mapKey, '[key]').trim().slice(0, 200);
}

/** Test hook. */
export function clearFirmsCache() {
  cache = null;
}
