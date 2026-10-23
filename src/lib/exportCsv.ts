import { reviewerName } from '../data/regions';
import type { EnrichedAlert } from '../types';
import { isLiveAlert } from './provenance';
import { STATUS_META } from './verification';

const COLUMNS: [header: string, value: (a: EnrichedAlert) => string | number][] = [
  ['alert_id', (a) => a.id],
  ['verification_status', (a) => STATUS_META[a.verification.status].label],
  ['priority_band', (a) => a.band],
  ['priority_score', (a) => a.score.score.toFixed(1)],
  ['score_is_lower_bound', (a) => (a.score.incomplete ? 'yes' : 'no')],
  ['region', (a) => a.regionName],
  ['centroid_lat', (a) => a.centroid[0].toFixed(5)],
  ['centroid_lon', (a) => a.centroid[1].toFixed(5)],
  ['observations', (a) => a.observations.length],
  ['distinct_passes', (a) => a.distinctPasses],
  ['first_observed_utc', (a) => a.firstObservedAt],
  ['last_observed_utc', (a) => a.lastObservedAt],
  ['nearest_asset', (a) => a.nearestAsset?.asset.name ?? ''],
  ['nearest_asset_km', (a) => (a.nearestAsset ? a.nearestAsset.distanceKm.toFixed(2) : '')],
  ['near_heat_source', (a) => a.nearHeatSource?.asset.name ?? ''],
  ['reviewer', (a) => (a.verification.reviewerId ? reviewerName(a.verification.reviewerId) : '')],
  ['data_source', (a) => (isLiveAlert(a) ? 'NASA FIRMS NRT' : 'Demo sample')],
];

/** RFC 4180 quoting; also neutralises leading =, +, -, @ so spreadsheets do not run formulas. */
export function csvCell(value: string | number): string {
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function alertsToCsv(alerts: EnrichedAlert[]): string {
  const rows = [COLUMNS.map(([h]) => h), ...alerts.map((a) => COLUMNS.map(([, v]) => v(a)))];
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
