import type { Region, RegionId, Reviewer } from '../types';

export const REGIONS: Region[] = [
  {
    id: 'uk',
    name: 'Garhwal–Kumaon',
    state: 'Uttarakhand',
    center: [29.85, 79.05],
    bounds: [[29.3, 78.3], [30.55, 79.9]],
    zoom: 9,
  },
  {
    id: 'mp',
    name: 'Kanha–Mandla',
    state: 'Madhya Pradesh',
    center: [22.35, 80.7],
    bounds: [[21.95, 80.2], [22.75, 81.25]],
    zoom: 10,
  },
  {
    id: 'od',
    name: 'Similipal–Rourkela',
    state: 'Odisha',
    center: [21.95, 85.7],
    bounds: [[21.45, 84.7], [22.35, 86.8]],
    zoom: 9,
  },
  {
    id: 'mz',
    name: 'Lunglei–Mamit',
    state: 'Mizoram',
    center: [23.4, 92.6],
    bounds: [[22.75, 92.2], [24.05, 93.0]],
    zoom: 9,
  },
  {
    id: 'pb',
    name: 'Malwa plains',
    state: 'Punjab',
    center: [30.5, 75.45],
    bounds: [[30.05, 74.85], [31.0, 76.1]],
    zoom: 9,
  },
];

export const INDIA_VIEW = { center: [23.5, 82.5] as [number, number], zoom: 5 };

export const regionById = (id: RegionId): Region => {
  const region = REGIONS.find((r) => r.id === id);
  if (!region) throw new Error(`Unknown region ${id}`);
  return region;
};

/** Fictional reviewer roster for the demo. */
export const REVIEWERS: Reviewer[] = [
  { id: 'rv-ar', name: 'Ananya Rawat', role: 'Remote-sensing analyst' },
  { id: 'rv-vn', name: 'Vikram Nair', role: 'Fire duty officer' },
  { id: 'rv-fq', name: 'Farhan Qureshi', role: 'GIS analyst' },
  { id: 'rv-ls', name: 'Lalremruati Sailo', role: 'Range liaison officer' },
  { id: 'rv-gs', name: 'Gurpreet Sandhu', role: 'District control room' },
];

export const reviewerName = (id: string | null | undefined): string =>
  (id && REVIEWERS.find((r) => r.id === id)?.name) || 'Unassigned';

export const DEFAULT_ACTOR = 'Demo operator';
