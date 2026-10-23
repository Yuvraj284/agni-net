import { GROUPING_CONFIG } from '../config/scoring';
import type { CandidateAlert, Observation } from '../types';
import { centroidOf, haversineKm } from './geo';

/**
 * Candidate-alert grouping rule
 * -----------------------------
 * Observations are grouped by **single-linkage spatial clustering**: two observations
 * belong to the same candidate alert if they are within `linkKm` (default 1.5 km) of each
 * other, directly or through a chain of other observations. Grouping is region-scoped.
 *
 * 1.5 km is roughly four VIIRS I-band pixels (375 m), so adjacent pixels from one pass and
 * repeat detections at the same site from later passes merge, while separate sites stay apart.
 *
 * Grouping never removes or edits observations — an alert only references observation IDs.
 * The alert ID is derived from the earliest member observation's ID, so it is stable as long
 * as the dataset is unchanged (which keeps persisted verification history attached).
 */
export function groupObservations(observations: Observation[], linkKm = GROUPING_CONFIG.linkKm): CandidateAlert[] {
  const n = observations.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = observations[i];
      const b = observations[j];
      if (a.regionId !== b.regionId) continue;
      if (haversineKm([a.lat, a.lon], [b.lat, b.lon]) <= linkKm) {
        parent[find(i)] = find(j);
      }
    }
  }

  const groups = new Map<number, Observation[]>();
  observations.forEach((o, i) => {
    const root = find(i);
    const list = groups.get(root) ?? [];
    list.push(o);
    groups.set(root, list);
  });

  const alerts = [...groups.values()].map((members): CandidateAlert => {
    const sorted = [...members].sort(
      (a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt) || a.id.localeCompare(b.id),
    );
    const centroid = centroidOf(sorted.map((o) => [o.lat, o.lon]));
    const passes = new Set(sorted.map((o) => passKey(o)));
    return {
      id: `ALT-${sorted[0].id.replace(/^OBS-/, '')}`,
      regionId: sorted[0].regionId,
      observationIds: sorted.map((o) => o.id),
      centroid,
      firstObservedAt: sorted[0].observedAt,
      lastObservedAt: sorted[sorted.length - 1].observedAt,
      distinctPasses: passes.size,
      extentKm: Math.max(...sorted.map((o) => haversineKm(centroid, [o.lat, o.lon]))),
    };
  });

  return alerts.sort((a, b) => a.id.localeCompare(b.id));
}

/** One overpass = one satellite at one acquisition minute (adjacent pixels share it). */
export function passKey(o: Pick<Observation, 'satellite' | 'observedAt'>): string {
  return `${o.satellite}|${o.observedAt.slice(0, 16)}`;
}
