import type { ConfidenceReading } from '../types';

export function relativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - Date.parse(iso);
  if (!Number.isFinite(diffMs)) return 'unknown time';
  const future = diffMs < 0;
  const mins = Math.round(Math.abs(diffMs) / 60_000);
  let text: string;
  if (mins < 1) text = 'just now';
  else if (mins < 60) text = `${mins} min`;
  else if (mins < 48 * 60) text = `${(mins / 60).toFixed(mins < 600 ? 1 : 0)} h`;
  else text = `${Math.round(mins / 1440)} d`;
  if (text === 'just now') return text;
  return future ? `in ${text}` : `${text} ago`;
}

const dateTimeFmt = new Intl.DateTimeFormat(undefined, {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));
export const formatDay = (iso: string) => dayFmt.format(new Date(iso));
export const formatUtc = (iso: string) => `${iso.slice(0, 16).replace('T', ' ')} UTC`;

export function formatCoord(lat: number, lon: number, digits = 4): string {
  return `${Math.abs(lat).toFixed(digits)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(digits)}°${lon >= 0 ? 'E' : 'W'}`;
}

export function formatKm(km: number): string {
  if (km === 0) return 'inside';
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function describeConfidence(c: ConfidenceReading): string {
  switch (c.scheme) {
    case 'viirs-category':
      return `VIIRS ${c.value}`;
    case 'modis-percent':
      return `MODIS ${c.value}%`;
    case 'missing':
      return 'Not reported';
  }
}
