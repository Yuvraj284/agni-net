import bordersRaw from '../../../public/geo/india-land-borders.geojson?raw';
import { describe, expect, it } from 'vitest';
import { featureFilter, validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { INDIA_OUTLINE } from '../../data/indiaOutline';
import { pointInPolygon } from '../../lib/geo';
import {
  COUNTRY_BOUNDARY_FILTER,
  SUPPRESSED_PLACE_NAMES,
  buildBasemapStyle,
} from './basemapStyle';

/** INDIA_OUTLINE is [lon, lat]; geo.pointInPolygon works on [lat, lon]. */
const outlineLatLon = INDIA_OUTLINE.map(([lon, lat]) => [lat, lon] as [number, number]);
const inIndia = (lat: number, lon: number) => pointInPolygon([lat, lon], outlineLatLon);

describe('India outline (official depiction)', () => {
  it.each([
    ['Gilgit (PoK)', 35.92, 74.31],
    ['Muzaffarabad (PoK)', 34.37, 73.47],
    ['Skardu (PoK)', 35.3, 75.63],
    ['Aksai Chin', 35.2, 79.3],
    ['Shaksgam valley', 36.0, 76.5],
    ['Srinagar', 34.08, 74.8],
    ['Leh', 34.16, 77.58],
    ['Dehradun', 30.32, 78.03],
  ])('includes %s', (_name, lat, lon) => {
    expect(inIndia(lat, lon)).toBe(true);
  });

  it.each([
    ['Islamabad', 33.69, 73.06],
    ['Lahore', 31.55, 74.34],
    ['Kathmandu', 27.7, 85.3],
    ['Kashgar', 39.47, 75.99],
  ])('excludes %s', (_name, lat, lon) => {
    expect(inIndia(lat, lon)).toBe(false);
  });
});

describe('drawn India land boundary', () => {
  const borders = JSON.parse(bordersRaw);
  const coords: [number, number][] = borders.features.flatMap((f: { geometry: { type: string; coordinates: unknown } }) =>
    f.geometry.type === 'LineString'
      ? (f.geometry.coordinates as [number, number][])
      : (f.geometry.coordinates as [number, number][][]).flat(),
  );
  const any = (pred: (lon: number, lat: number) => boolean) => coords.some(([lon, lat]) => pred(lon, lat));

  it('runs along the Wakhan corridor (India–Afghanistan, north of PoK)', () => {
    expect(any((lon, lat) => lon > 72.5 && lon < 75 && lat > 36.6 && lat < 37.2)).toBe(true);
  });

  it('encloses Aksai Chin to the east', () => {
    expect(any((lon, lat) => lon > 79.8 && lat > 34.5 && lat < 36)).toBe(true);
  });

  it('does not follow the Line of Control', () => {
    // Srinagar–Muzaffarabad corridor midpoint area: the LoC passes ~74.0E, 34.3N.
    expect(any((lon, lat) => Math.abs(lon - 74.0) < 0.15 && Math.abs(lat - 34.3) < 0.15)).toBe(false);
  });
});

describe('basemap style', () => {
  const evaluate = (props: Record<string, unknown>) =>
    featureFilter(COUNTRY_BOUNDARY_FILTER).filter({ zoom: 6 }, { type: 2, properties: props, geometry: [] } as never);

  it.each(['light', 'dark'] as const)('is a valid MapLibre style (%s)', (theme) => {
    expect(validateStyleMin(buildBasemapStyle(theme))).toEqual([]);
  });

  it('hides OSM boundaries that India draws itself', () => {
    const base = { admin_level: 2, maritime: 0, disputed: 0 };
    expect(evaluate({ ...base, disputed: 1, disputed_name: 'LineofControl' })).toBe(false);
    expect(evaluate({ ...base, adm0_l: 'IND', adm0_r: 'PAK' })).toBe(false);
    expect(evaluate({ ...base, adm0_l: 'CHN', adm0_r: 'IND' })).toBe(false);
    expect(evaluate({ ...base, adm0_l: 'CHN', adm0_r: 'PAK' })).toBe(false);
    expect(evaluate({ ...base, disputed: 1, claimed_by: 'IN' })).toBe(false);
  });

  it('keeps unrelated international boundaries', () => {
    expect(evaluate({ admin_level: 2, maritime: 0, disputed: 0, adm0_l: 'AFG', adm0_r: 'PAK' })).toBe(true);
    expect(evaluate({ admin_level: 2, maritime: 0, disputed: 0, adm0_l: 'NPL', adm0_r: 'CHN' })).toBe(true);
  });

  it('suppresses PoK administrative labels', () => {
    expect(SUPPRESSED_PLACE_NAMES).toEqual(expect.arrayContaining(['Gilgit-Baltistan', 'Azad Kashmir']));
  });
});
