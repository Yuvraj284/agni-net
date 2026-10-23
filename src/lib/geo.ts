import type { Asset } from '../types';

const EARTH_RADIUS_KM = 6371.0088;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two [lat, lon] points in kilometres. */
export function haversineKm(a: [number, number], b: [number, number]): number {
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Ray-casting point-in-polygon test on [lat, lon] vertices. */
export function pointInPolygon(p: [number, number], ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [yi, xi] = ring[i];
    const [yj, xj] = ring[j];
    const crosses = yi > p[0] !== yj > p[0] && p[1] < ((xj - xi) * (p[0] - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/**
 * Distance from a point to a polygon edge in km, using a local equirectangular
 * projection around the point (accurate to well under 1% at the <50 km scales used here).
 */
function distanceToRingKm(p: [number, number], ring: [number, number][]): number {
  const kmPerDegLat = 111.32;
  const kmPerDegLon = 111.32 * Math.cos(toRad(p[0]));
  const project = ([lat, lon]: [number, number]) => [(lon - p[1]) * kmPerDegLon, (lat - p[0]) * kmPerDegLat];
  let best = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const [ax, ay] = project(ring[i]);
    const [bx, by] = project(ring[(i + 1) % ring.length]);
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lenSq));
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    best = Math.min(best, Math.hypot(cx, cy));
  }
  return best;
}

/** Distance from a point to an asset in km. 0 when the point lies inside a polygon asset. */
export function distanceToAssetKm(p: [number, number], asset: Asset): number {
  if (asset.geometry === 'point') return haversineKm(p, asset.location);
  if (pointInPolygon(p, asset.ring)) return 0;
  return distanceToRingKm(p, asset.ring);
}

export function centroidOf(points: [number, number][]): [number, number] {
  const n = points.length;
  const sum = points.reduce((acc, [lat, lon]) => [acc[0] + lat, acc[1] + lon], [0, 0]);
  return [sum[0] / n, sum[1] / n];
}
