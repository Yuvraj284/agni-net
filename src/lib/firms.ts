import { REGIONS } from '../data/regions';
import type { ConfidenceReading, Observation, RegionId, Satellite } from '../types';

/**
 * Converts NASA FIRMS near-real-time CSV (VIIRS 375 m and MODIS 1 km) into AgniNet
 * observations. Only detections inside AgniNet's monitored regions are kept; the rest are
 * counted so the UI can say how many were outside coverage.
 */

export type FirmsSourceName = 'VIIRS_SNPP_NRT' | 'VIIRS_NOAA20_NRT' | 'VIIRS_NOAA21_NRT' | 'MODIS_NRT';

export interface FirmsSourceResult {
  source: FirmsSourceName;
  ok: boolean;
  csv?: string;
  error?: string;
}

export interface FirmsProxyBody {
  fetchedAt: string;
  days: number;
  bbox: string;
  results: FirmsSourceResult[];
}

export interface LiveDataset {
  observations: Observation[];
  fetchedAt: string;
  days: number;
  /** Detections returned by FIRMS for the India bounding box. */
  totalDetections: number;
  /** Detections outside AgniNet's monitored regions (not shown). */
  outsideRegions: number;
  failedSources: { source: FirmsSourceName; error: string }[];
}

const VIIRS_SATELLITE: Record<string, Satellite> = {
  VIIRS_SNPP_NRT: 'Suomi NPP',
  VIIRS_NOAA20_NRT: 'NOAA-20',
  VIIRS_NOAA21_NRT: 'NOAA-21',
};

/** Minimal CSV parser for FIRMS output (no quoted fields). */
export function parseCsv(csv: string): Record<string, string>[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    return Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? '').trim()]));
  });
}

/** Stable short id from a detection's identity, so alert ids survive re-fetches. */
function shortHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).padStart(7, '0');
}

function regionFor(lat: number, lon: number): RegionId | null {
  const r = REGIONS.find(({ bounds: [[s, w], [n, e]] }) => lat >= s && lat <= n && lon >= w && lon <= e);
  return r?.id ?? null;
}

function viirsConfidence(raw: string): ConfidenceReading {
  const v = raw.toLowerCase();
  if (v === 'l' || v === 'low') return { scheme: 'viirs-category', value: 'low' };
  if (v === 'n' || v === 'nominal') return { scheme: 'viirs-category', value: 'nominal' };
  if (v === 'h' || v === 'high') return { scheme: 'viirs-category', value: 'high' };
  return { scheme: 'missing' };
}

function modisConfidence(raw: string): ConfidenceReading {
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? { scheme: 'modis-percent', value: n } : { scheme: 'missing' };
}

const num = (raw: string | undefined) => {
  const n = Number.parseFloat(raw ?? '');
  return Number.isFinite(n) ? n : null;
};

/** One FIRMS row → Observation, or null when it is malformed or outside monitored regions. */
export function rowToObservation(source: FirmsSourceName, row: Record<string, string>): Observation | null | 'outside' {
  const lat = num(row.latitude);
  const lon = num(row.longitude);
  const date = row.acq_date;
  const time = (row.acq_time ?? '').padStart(4, '0');
  if (lat === null || lon === null || !/^\d{4}-\d{2}-\d{2}$/.test(date ?? '') || !/^\d{4}$/.test(time)) return null;

  const regionId = regionFor(lat, lon);
  if (!regionId) return 'outside';

  const isModis = source === 'MODIS_NRT';
  const satellite: Satellite | undefined = isModis
    ? row.satellite === 'T' || row.satellite === 'Terra'
      ? 'Terra'
      : row.satellite === 'A' || row.satellite === 'Aqua'
        ? 'Aqua'
        : undefined
    : VIIRS_SATELLITE[source];
  if (!satellite) return null;

  const observedAt = `${date}T${time.slice(0, 2)}:${time.slice(2)}:00Z`;
  return {
    id: `F-${shortHash(`${source}|${date}|${time}|${row.latitude}|${row.longitude}`)}`,
    lat,
    lon,
    observedAt,
    satellite,
    instrument: isModis ? 'MODIS' : 'VIIRS',
    confidence: isModis ? modisConfidence(row.confidence ?? '') : viirsConfidence(row.confidence ?? ''),
    brightnessK: num(isModis ? row.brightness : row.bright_ti4),
    frpMW: num(row.frp),
    dayNight: row.daynight === 'N' ? 'N' : 'D',
    regionId,
    provenance: 'firms-nrt',
  };
}

export function toLiveDataset(body: FirmsProxyBody): LiveDataset {
  const seen = new Set<string>();
  const observations: Observation[] = [];
  let total = 0;
  let outside = 0;
  for (const result of body.results) {
    if (!result.ok || !result.csv) continue;
    for (const row of parseCsv(result.csv)) {
      total++;
      const obs = rowToObservation(result.source, row);
      if (obs === 'outside') outside++;
      else if (obs && !seen.has(obs.id)) {
        seen.add(obs.id);
        observations.push(obs);
      }
    }
  }
  return {
    observations: observations.sort((a, b) => a.observedAt.localeCompare(b.observedAt) || a.id.localeCompare(b.id)),
    fetchedAt: body.fetchedAt,
    days: body.days,
    totalDetections: total,
    outsideRegions: outside,
    failedSources: body.results.filter((r) => !r.ok).map((r) => ({ source: r.source, error: r.error ?? 'unknown error' })),
  };
}

export class LiveFeedError extends Error {
  constructor(
    message: string,
    readonly code: 'not_configured' | 'unavailable' | 'failed',
  ) {
    super(message);
  }
}

/** Fetches through the same-origin proxy; the FIRMS key never reaches the browser. */
export async function fetchLiveDataset(days = 1): Promise<LiveDataset> {
  let res: Response;
  try {
    res = await fetch(`/api/firms?days=${days}`, { headers: { Accept: 'application/json' } });
  } catch {
    throw new LiveFeedError('Could not reach the AgniNet server.', 'unavailable');
  }
  const body = (await res.json().catch(() => null)) as (Partial<FirmsProxyBody> & { error?: string; message?: string }) | null;
  if (res.status === 503 && body?.error) {
    throw new LiveFeedError(body.message ?? 'Live feed is not configured.', 'not_configured');
  }
  if (res.status === 404 || !body) {
    throw new LiveFeedError('The live-data proxy is not available on this server (it runs with npm run dev or preview).', 'unavailable');
  }
  if (!res.ok) {
    const first = body.results?.find((r) => r.error)?.error;
    throw new LiveFeedError(`NASA FIRMS request failed${first ? `: ${first}` : '.'}`, 'failed');
  }
  return toLiveDataset(body as FirmsProxyBody);
}
