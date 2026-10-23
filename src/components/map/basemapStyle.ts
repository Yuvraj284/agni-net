import type {
  ExpressionSpecification,
  FilterSpecification,
  LayerSpecification,
  StyleSpecification,
} from 'maplibre-gl';
import type { Theme } from '../../theme/theme';
import { INDIA_OUTLINE } from '../../data/indiaOutline';

/**
 * Vector basemap style.
 *
 * Tiles: OpenFreeMap (keyless OpenMapTiles-schema vector tiles built from OpenStreetMap).
 *
 * India's boundary follows the official depiction of the Government of India: Jammu &
 * Kashmir and Ladakh in full, including Pakistan-occupied Kashmir (Gilgit-Baltistan), Aksai
 * Chin and the Shaksgam valley. OpenStreetMap maps boundaries "on the ground", so this style
 *   1. hides every OSM country boundary that touches India, every disputed line (LoC, LAC,
 *      claim lines) and the China–Pakistan line (Shaksgam), and
 *   2. draws India's land boundary from Natural Earth's India point-of-view dataset
 *      (public/geo/india-land-borders.geojson, public domain).
 * Labels for Pakistan's administrative names inside PoK are suppressed for the same reason.
 */

export const OPENFREEMAP_TILEJSON = 'https://tiles.openfreemap.org/planet';
export const INDIA_BORDERS_URL = `${import.meta.env.BASE_URL}geo/india-land-borders.geojson`;

export const BASEMAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> · ' +
  '<a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">&copy; OpenMapTiles</a> · ' +
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors · ' +
  'India boundary: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a> (India view)';

/** Administrative label names OSM uses for Pakistan-occupied Kashmir; not shown on this map. */
export const SUPPRESSED_PLACE_NAMES = ['Azad Kashmir', 'Azad Jammu and Kashmir', 'Gilgit-Baltistan'];

/** OSM country boundaries kept from the tiles. Everything India-related comes from our overlay. */
export const COUNTRY_BOUNDARY_FILTER: FilterSpecification = [
  'all',
  ['==', ['get', 'admin_level'], 2],
  ['!=', ['get', 'maritime'], 1],
  ['!=', ['get', 'disputed'], 1],
  ['!', ['has', 'claimed_by']],
  ['!=', ['get', 'adm0_l'], 'IND'],
  ['!=', ['get', 'adm0_r'], 'IND'],
  [
    '!',
    [
      'any',
      ['all', ['==', ['get', 'adm0_l'], 'CHN'], ['==', ['get', 'adm0_r'], 'PAK']],
      ['all', ['==', ['get', 'adm0_l'], 'PAK'], ['==', ['get', 'adm0_r'], 'CHN']],
    ],
  ],
];

export const STATE_BOUNDARY_FILTER: FilterSpecification = [
  'all',
  ['>=', ['get', 'admin_level'], 3],
  ['<=', ['get', 'admin_level'], 4],
  ['!=', ['get', 'maritime'], 1],
  ['!=', ['get', 'disputed'], 1],
];

const englishName: ExpressionSpecification = ['coalesce', ['get', 'name:en'], ['get', 'name_en'], ['get', 'name']];

const INDIA_POLYGON = { type: 'Polygon' as const, coordinates: [INDIA_OUTLINE] };

const notSuppressed: ExpressionSpecification = ['!', ['in', englishName, ['literal', SUPPRESSED_PLACE_NAMES]]];

interface Palette {
  land: string;
  water: string;
  waterLine: string;
  wood: string;
  grass: string;
  ice: string;
  park: string;
  urban: string;
  roadMajor: string;
  roadMajorCasing: string;
  roadMinor: string;
  rail: string;
  stateLine: string;
  countryLine: string;
  indiaLine: string;
  label: string;
  labelMuted: string;
  halo: string;
}

const PALETTES: Record<Theme, Palette> = {
  light: {
    land: '#f3f1eb',
    water: '#c9d9e0',
    waterLine: '#b6cbd4',
    wood: '#dfe5d3',
    grass: '#e7eadb',
    ice: '#f7f8f8',
    park: '#d9e4d0',
    urban: '#e8e3d9',
    roadMajor: '#ffffff',
    roadMajorCasing: '#d6cfc1',
    roadMinor: '#fbfaf7',
    rail: '#c4bdb0',
    stateLine: '#a9a293',
    countryLine: '#8c8576',
    indiaLine: '#6d6657',
    label: '#4f534e',
    labelMuted: '#7a7d76',
    halo: 'rgba(248,246,241,0.9)',
  },
  dark: {
    land: '#1c1f1e',
    water: '#141d22',
    waterLine: '#1f2c33',
    wood: '#1f2620',
    grass: '#212622',
    ice: '#262a29',
    park: '#1e2a22',
    urban: '#242725',
    roadMajor: '#3a3f3c',
    roadMajorCasing: '#2b2f2d',
    roadMinor: '#2d3130',
    rail: '#3a3f3c',
    stateLine: '#4a504c',
    countryLine: '#68706b',
    indiaLine: '#8f9891',
    label: '#b5b7ae',
    labelMuted: '#8a8d85',
    halo: 'rgba(20,22,21,0.9)',
  },
};

const FONT_REGULAR = ['Noto Sans Regular'];
const FONT_BOLD = ['Noto Sans Bold'];

export function buildBasemapStyle(theme: Theme): StyleSpecification {
  const p = PALETTES[theme];
  const src = 'openmaptiles';
  const cls = (...classes: string[]): ExpressionSpecification => ['match', ['get', 'class'], classes, true, false];

  const layers: LayerSpecification[] = [
    { id: 'background', type: 'background', paint: { 'background-color': p.land } },
    { id: 'landcover-wood', type: 'fill', source: src, 'source-layer': 'landcover', filter: cls('wood'), paint: { 'fill-color': p.wood } },
    { id: 'landcover-grass', type: 'fill', source: src, 'source-layer': 'landcover', filter: cls('grass', 'farmland'), paint: { 'fill-color': p.grass, 'fill-opacity': 0.6 } },
    { id: 'landcover-ice', type: 'fill', source: src, 'source-layer': 'landcover', filter: cls('ice'), paint: { 'fill-color': p.ice } },
    { id: 'park', type: 'fill', source: src, 'source-layer': 'park', paint: { 'fill-color': p.park, 'fill-opacity': 0.55 } },
    { id: 'landuse-urban', type: 'fill', source: src, 'source-layer': 'landuse', minzoom: 9, filter: cls('residential', 'commercial', 'industrial'), paint: { 'fill-color': p.urban } },
    { id: 'water', type: 'fill', source: src, 'source-layer': 'water', paint: { 'fill-color': p.water } },
    {
      id: 'waterway', type: 'line', source: src, 'source-layer': 'waterway', minzoom: 7,
      paint: { 'line-color': p.waterLine, 'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.5, 14, 2] },
    },
    {
      id: 'road-minor', type: 'line', source: src, 'source-layer': 'transportation', minzoom: 11,
      filter: cls('minor', 'service', 'track'),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': p.roadMinor, 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.5, 16, 4] },
    },
    {
      id: 'road-secondary', type: 'line', source: src, 'source-layer': 'transportation', minzoom: 8,
      filter: cls('secondary', 'tertiary'),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': p.roadMinor, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 16, 6] },
    },
    {
      id: 'road-major-casing', type: 'line', source: src, 'source-layer': 'transportation', minzoom: 6,
      filter: cls('motorway', 'trunk', 'primary'),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': p.roadMajorCasing, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.8, 16, 10] },
    },
    {
      id: 'road-major', type: 'line', source: src, 'source-layer': 'transportation', minzoom: 6,
      filter: cls('motorway', 'trunk', 'primary'),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': p.roadMajor, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.4, 16, 8] },
    },
    {
      id: 'rail', type: 'line', source: src, 'source-layer': 'transportation', minzoom: 10, filter: cls('rail'),
      paint: { 'line-color': p.rail, 'line-width': 1, 'line-dasharray': [3, 3] },
    },
    {
      id: 'boundary-state', type: 'line', source: src, 'source-layer': 'boundary', minzoom: 4,
      filter: STATE_BOUNDARY_FILTER,
      paint: { 'line-color': p.stateLine, 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.5, 10, 1.2], 'line-dasharray': [3, 2] },
    },
    {
      id: 'boundary-country', type: 'line', source: src, 'source-layer': 'boundary',
      filter: COUNTRY_BOUNDARY_FILTER,
      layout: { 'line-join': 'round' },
      paint: { 'line-color': p.countryLine, 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.8, 10, 2] },
    },
    {
      id: 'boundary-india', type: 'line', source: 'india-borders',
      layout: { 'line-join': 'round' },
      paint: { 'line-color': p.indiaLine, 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 1, 10, 2.4] },
    },
    {
      id: 'label-village', type: 'symbol', source: src, 'source-layer': 'place', minzoom: 11,
      filter: ['all', cls('village', 'hamlet'), notSuppressed],
      layout: { 'text-field': englishName, 'text-font': FONT_REGULAR, 'text-size': 11 },
      paint: { 'text-color': p.labelMuted, 'text-halo-color': p.halo, 'text-halo-width': 1.2 },
    },
    {
      id: 'label-town', type: 'symbol', source: src, 'source-layer': 'place', minzoom: 8,
      filter: ['all', cls('town'), notSuppressed],
      layout: { 'text-field': englishName, 'text-font': FONT_REGULAR, 'text-size': 12 },
      paint: { 'text-color': p.label, 'text-halo-color': p.halo, 'text-halo-width': 1.2 },
    },
    {
      id: 'label-city', type: 'symbol', source: src, 'source-layer': 'place', minzoom: 5,
      filter: ['all', cls('city'), notSuppressed],
      layout: { 'text-field': englishName, 'text-font': FONT_REGULAR, 'text-size': ['interpolate', ['linear'], ['zoom'], 5, 11, 10, 14] },
      paint: { 'text-color': p.label, 'text-halo-color': p.halo, 'text-halo-width': 1.4 },
    },
    {
      id: 'label-state', type: 'symbol', source: src, 'source-layer': 'place', minzoom: 4, maxzoom: 9,
      // Only India's states and union territories; neighbouring provinces add clutter at national zoom.
      filter: ['all', cls('state'), notSuppressed, ['within', INDIA_POLYGON]],
      layout: {
        'text-field': englishName, 'text-font': FONT_REGULAR, 'text-size': 11,
        'text-transform': 'uppercase', 'text-letter-spacing': 0.08, 'text-max-width': 8,
      },
      paint: { 'text-color': p.labelMuted, 'text-halo-color': p.halo, 'text-halo-width': 1.2 },
    },
    {
      id: 'label-country', type: 'symbol', source: src, 'source-layer': 'place', maxzoom: 8,
      filter: ['all', cls('country'), notSuppressed],
      layout: { 'text-field': englishName, 'text-font': FONT_BOLD, 'text-size': ['interpolate', ['linear'], ['zoom'], 3, 11, 7, 15], 'text-max-width': 8 },
      paint: { 'text-color': p.label, 'text-halo-color': p.halo, 'text-halo-width': 1.6 },
    },
  ];

  return {
    version: 8,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      openmaptiles: { type: 'vector', url: OPENFREEMAP_TILEJSON },
      'india-borders': { type: 'geojson', data: INDIA_BORDERS_URL },
    },
    layers,
  };
}
