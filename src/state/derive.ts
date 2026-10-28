import { ASSETS } from '../data/assets';
import { regionById } from '../data/regions';
import { generateObservations } from '../data/observations';
import { groupObservations } from '../lib/alerts';
import { findNearestFireStation } from '../lib/fireStations';
import { bandFor, scoreAlert } from '../lib/scoring';
import { INITIAL_STATE, STATUSES, deriveAll } from '../lib/verification';
import type { Asset, EnrichedAlert, Observation, RegionId, VerificationEvent } from '../types';
import type { Bounds, ConfidenceFilter, Filters, TimeWindow } from './types';

/**
 * Pure derivation pipeline: anchor → observations → candidate alerts → scores + verification.
 * Every view (map, queue, metrics, timeline) reads from this one result, so they cannot disagree.
 */
export function deriveAlerts(
  observations: Observation[],
  events: VerificationEvent[],
  assets: Asset[],
  now: Date,
): EnrichedAlert[] {
  const byId = new Map(observations.map((o) => [o.id, o]));
  const verification = deriveAll(events);
  return groupObservations(observations).map((alert) => {
    const obs = alert.observationIds.map((id) => byId.get(id)!).filter(Boolean);
    const { proximity, ...score } = scoreAlert(alert, obs, assets, now);
    return {
      ...alert,
      observations: obs,
      score,
      band: bandFor(score.score),
      verification: verification.get(alert.id) ?? INITIAL_STATE,
      regionName: regionById(alert.regionId).name,
      nearestAsset: proximity.nearest,
      nearHeatSource: proximity.heatSource,
      nearestFireStation: findNearestFireStation(alert.centroid, alert.regionId),
    };
  });
}

export function observationsFor(anchor: string): Observation[] {
  return generateObservations(new Date(anchor)).observations;
}

export const DEFAULT_ASSETS = ASSETS;

const WINDOW_HOURS: Record<TimeWindow, number> = { all: Infinity, '6h': 6, '24h': 24, '72h': 72 };

export function confidenceClass(alert: EnrichedAlert): Exclude<ConfidenceFilter, 'all'> {
  const c = alert.score.factors.C.value;
  if (c === null) return 'unknown';
  if (c >= 80) return 'high';
  if (c >= 50) return 'nominal';
  return 'low';
}

function inBounds(lat: number, lon: number, b: Bounds) {
  return lat >= b[0][0] && lat <= b[1][0] && lon >= b[0][1] && lon <= b[1][1];
}

export function scopeToRegion(alerts: EnrichedAlert[], regionId: RegionId | 'all') {
  return regionId === 'all' ? alerts : alerts.filter((a) => a.regionId === regionId);
}

/** Filters + sort. Map-bounds limiting is applied separately (see limitToBounds). */
export function applyFilters(alerts: EnrichedAlert[], filters: Filters, now: Date): EnrichedAlert[] {
  const maxAgeMs = WINDOW_HOURS[filters.window] * 3_600_000;
  const q = filters.search.trim().toLowerCase();
  const out = alerts.filter((a) => {
    if (now.getTime() - Date.parse(a.lastObservedAt) > maxAgeMs) return false;
    if (filters.confidence !== 'all' && confidenceClass(a) !== filters.confidence) return false;
    if (filters.statuses.length && !filters.statuses.includes(a.verification.status)) return false;
    if (filters.bands.length && !filters.bands.includes(a.band)) return false;
    if (q) {
      const haystack = [
        a.id,
        a.regionName,
        a.nearestAsset?.asset.name ?? '',
        a.nearestFireStation?.station.name ?? '',
        ...a.observationIds,
      ].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
  return sortAlerts(out, filters.sort);
}

/** Keep alerts with at least one observation inside the given map bounds. */
export function limitToBounds(alerts: EnrichedAlert[], bounds: Bounds | null): EnrichedAlert[] {
  if (!bounds) return alerts;
  return alerts.filter((a) => a.observations.some((o) => inBounds(o.lat, o.lon, bounds)));
}

export function sortAlerts(alerts: EnrichedAlert[], sort: Filters['sort']): EnrichedAlert[] {
  const by = {
    priority: (a: EnrichedAlert, b: EnrichedAlert) => b.score.score - a.score.score,
    recent: (a: EnrichedAlert, b: EnrichedAlert) => Date.parse(b.lastObservedAt) - Date.parse(a.lastObservedAt),
    confidence: (a: EnrichedAlert, b: EnrichedAlert) =>
      (b.score.factors.C.value ?? -1) - (a.score.factors.C.value ?? -1),
    observations: (a: EnrichedAlert, b: EnrichedAlert) => b.observations.length - a.observations.length,
    status: (a: EnrichedAlert, b: EnrichedAlert) =>
      STATUSES.indexOf(a.verification.status) - STATUSES.indexOf(b.verification.status),
  }[sort];
  return [...alerts].sort((a, b) => by(a, b) || b.score.score - a.score.score || a.id.localeCompare(b.id));
}

export interface Metrics {
  observations: number;
  alerts: number;
  awaiting: number;
  urgentAwaiting: number;
  confirmed: number;
  unconfirmed: number;
  inconclusive: number;
  incomplete: number;
}

export function computeMetrics(alerts: EnrichedAlert[]): Metrics {
  const count = (pred: (a: EnrichedAlert) => boolean) => alerts.filter(pred).length;
  return {
    observations: alerts.reduce((s, a) => s + a.observations.length, 0),
    alerts: alerts.length,
    awaiting: count((a) => a.verification.status === 'awaiting'),
    urgentAwaiting: count(
      (a) => a.verification.status === 'awaiting' && (a.band === 'critical' || a.band === 'high'),
    ),
    confirmed: count((a) => a.verification.status === 'confirmed'),
    unconfirmed: count((a) => a.verification.status === 'unconfirmed'),
    inconclusive: count((a) => a.verification.status === 'inconclusive'),
    incomplete: count((a) => a.score.incomplete),
  };
}
