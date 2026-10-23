import type { ConfidenceReading, Observation, RegionId, Satellite, VerificationEvent } from '../types';

/**
 * DEMO / SAMPLE observation generator.
 *
 * Produces a deterministic set of ~50 synthetic hotspot observations in a FIRMS-like schema.
 * These are NOT from a live satellite feed. Timestamps are relative to an `anchor` time — the
 * moment the demo dataset was first generated in this browser — so the data looks current
 * while staying identical across reloads (the anchor is persisted).
 */

type Profile = 'high' | 'nominal' | 'low' | 'missing';

interface PassSpec {
  hoursAgo: number;
  sat: Satellite;
  pixels: number;
}

interface SiteSpec {
  key: string;
  regionId: RegionId;
  center: [number, number];
  profile: Profile;
  frp: [number, number];
  /** Listed oldest → newest so the earliest observation gets the lowest ID. */
  passes: PassSpec[];
}

const SITES: SiteSpec[] = [
  // Uttarakhand — pine-forest fire season pattern
  { key: 'uk-pauri', regionId: 'uk', center: [30.15, 78.79], profile: 'high', frp: [12, 48],
    passes: [{ hoursAgo: 30, sat: 'Suomi NPP', pixels: 1 }, { hoursAgo: 18, sat: 'NOAA-20', pixels: 2 },
      { hoursAgo: 6, sat: 'Suomi NPP', pixels: 1 }, { hoursAgo: 3, sat: 'NOAA-21', pixels: 2 }] },
  { key: 'uk-corbett', regionId: 'uk', center: [29.54, 78.88], profile: 'nominal', frp: [6, 22],
    passes: [{ hoursAgo: 14, sat: 'NOAA-20', pixels: 1 }, { hoursAgo: 2, sat: 'Suomi NPP', pixels: 2 }] },
  { key: 'uk-almora', regionId: 'uk', center: [29.625, 79.665], profile: 'nominal', frp: [5, 12],
    passes: [{ hoursAgo: 5, sat: 'Aqua', pixels: 1 }] },
  { key: 'uk-tehri', regionId: 'uk', center: [30.4, 78.48], profile: 'low', frp: [2, 6],
    passes: [{ hoursAgo: 40, sat: 'Terra', pixels: 1 }] },
  // Madhya Pradesh — central Indian sal forests
  { key: 'mp-kanha', regionId: 'mp', center: [22.27, 80.64], profile: 'high', frp: [10, 36],
    passes: [{ hoursAgo: 26, sat: 'Suomi NPP', pixels: 1 }, { hoursAgo: 13, sat: 'NOAA-20', pixels: 2 },
      { hoursAgo: 1.5, sat: 'NOAA-21', pixels: 1 }] },
  { key: 'mp-mandla-rf', regionId: 'mp', center: [22.56, 80.46], profile: 'nominal', frp: [4, 15],
    passes: [{ hoursAgo: 20, sat: 'Suomi NPP', pixels: 1 }, { hoursAgo: 8, sat: 'Aqua', pixels: 1 }] },
  { key: 'mp-farm', regionId: 'mp', center: [22.05, 81.12], profile: 'low', frp: [1, 4],
    passes: [{ hoursAgo: 60, sat: 'NOAA-20', pixels: 1 }] },
  { key: 'mp-noconf', regionId: 'mp', center: [22.64, 80.335], profile: 'missing', frp: [3, 8],
    passes: [{ hoursAgo: 9, sat: 'Suomi NPP', pixels: 1 }] },
  // Odisha — Similipal plus a persistent industrial heat source
  { key: 'od-similipal', regionId: 'od', center: [21.86, 86.31], profile: 'high', frp: [18, 64],
    passes: [{ hoursAgo: 36, sat: 'Suomi NPP', pixels: 1 }, { hoursAgo: 24, sat: 'NOAA-20', pixels: 2 },
      { hoursAgo: 12, sat: 'Suomi NPP', pixels: 1 }, { hoursAgo: 4, sat: 'NOAA-21', pixels: 2 },
      { hoursAgo: 1, sat: 'NOAA-20', pixels: 1 }] },
  { key: 'od-similipal-edge', regionId: 'od', center: [21.66, 86.1], profile: 'nominal', frp: [5, 14],
    passes: [{ hoursAgo: 16, sat: 'Terra', pixels: 1 }, { hoursAgo: 7, sat: 'Suomi NPP', pixels: 1 }] },
  { key: 'od-rourkela', regionId: 'od', center: [22.218, 84.872], profile: 'high', frp: [30, 90],
    passes: [{ hoursAgo: 70, sat: 'Suomi NPP', pixels: 1 }, { hoursAgo: 46, sat: 'NOAA-20', pixels: 1 },
      { hoursAgo: 22, sat: 'Suomi NPP', pixels: 2 }, { hoursAgo: 10, sat: 'NOAA-21', pixels: 1 }] },
  { key: 'od-keonjhar', regionId: 'od', center: [21.63, 85.56], profile: 'nominal', frp: [4, 10],
    passes: [{ hoursAgo: 28, sat: 'Aqua', pixels: 1 }] },
  // Mizoram — shifting-cultivation (jhum) burning season
  { key: 'mz-lunglei', regionId: 'mz', center: [22.93, 92.77], profile: 'nominal', frp: [8, 30],
    passes: [{ hoursAgo: 50, sat: 'Suomi NPP', pixels: 1 }, { hoursAgo: 26, sat: 'NOAA-20', pixels: 2 },
      { hoursAgo: 3, sat: 'NOAA-21', pixels: 2 }] },
  { key: 'mz-dampa', regionId: 'mz', center: [23.66, 92.4], profile: 'nominal', frp: [5, 16],
    passes: [{ hoursAgo: 11, sat: 'NOAA-20', pixels: 1 }, { hoursAgo: 6, sat: 'Terra', pixels: 1 }] },
  { key: 'mz-mamit', regionId: 'mz', center: [23.93, 92.49], profile: 'low', frp: [2, 5],
    passes: [{ hoursAgo: 84, sat: 'Suomi NPP', pixels: 1 }] },
  // Punjab — agricultural residue burning (hotspots ≠ forest fires)
  { key: 'pb-sangrur', regionId: 'pb', center: [30.29, 75.8], profile: 'nominal', frp: [6, 20],
    passes: [{ hoursAgo: 8, sat: 'Suomi NPP', pixels: 2 }, { hoursAgo: 4, sat: 'NOAA-21', pixels: 2 }] },
  { key: 'pb-bathinda', regionId: 'pb', center: [30.17, 75.05], profile: 'nominal', frp: [5, 18],
    passes: [{ hoursAgo: 30, sat: 'NOAA-20', pixels: 1 }, { hoursAgo: 6, sat: 'Suomi NPP', pixels: 2 }] },
  { key: 'pb-ludhiana', regionId: 'pb', center: [30.86, 75.95], profile: 'low', frp: [2, 5],
    passes: [{ hoursAgo: 2, sat: 'Aqua', pixels: 1 }] },
];

/** Small deterministic PRNG (mulberry32), seeded per site so sites are independent. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const isModis = (sat: Satellite) => sat === 'Aqua' || sat === 'Terra';

function confidenceFor(profile: Profile, sat: Satellite, rand: () => number): ConfidenceReading {
  if (profile === 'missing') return { scheme: 'missing' };
  if (isModis(sat)) {
    const ranges: Record<Exclude<Profile, 'missing'>, [number, number]> = {
      high: [80, 96],
      nominal: [52, 78],
      low: [25, 45],
    };
    const [lo, hi] = ranges[profile];
    return { scheme: 'modis-percent', value: Math.round(lo + rand() * (hi - lo)) };
  }
  // VIIRS: mostly the site's profile, occasionally one category lower (realistic variation).
  const order = ['low', 'nominal', 'high'] as const;
  const idx = order.indexOf(profile);
  const value = rand() < 0.2 && idx > 0 ? order[idx - 1] : order[idx];
  return { scheme: 'viirs-category', value };
}

const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

export interface GeneratedDataset {
  observations: Observation[];
  /** First observation ID per site key — used to attach seeded review events to alerts. */
  siteFirstObservation: Record<string, string>;
}

export function generateObservations(anchor: Date): GeneratedDataset {
  const counters: Record<string, number> = {};
  const observations: Observation[] = [];
  const siteFirstObservation: Record<string, string> = {};
  const anchorMs = Math.floor(anchor.getTime() / 60_000) * 60_000;

  for (const site of SITES) {
    const rand = mulberry32(hashString(site.key));
    for (const pass of site.passes) {
      // Whole-minute acquisition time shared by all pixels from the same overpass.
      const t = new Date(anchorMs - Math.round(pass.hoursAgo * 60) * 60_000);
      const passDLat = (rand() - 0.5) * 0.004;
      const passDLon = (rand() - 0.5) * 0.004;
      const localHour = (t.getUTCHours() + 5.5) % 24; // IST
      for (let p = 0; p < pass.pixels; p++) {
        const n = (counters[site.regionId] = (counters[site.regionId] ?? 0) + 1);
        const id = `OBS-${site.regionId.toUpperCase()}-${String(n).padStart(3, '0')}`;
        siteFirstObservation[site.key] ??= id;
        const modis = isModis(pass.sat);
        observations.push({
          id,
          lat: round(site.center[0] + passDLat + p * 0.0034, 5),
          lon: round(site.center[1] + passDLon + p * 0.0021, 5),
          observedAt: t.toISOString(),
          satellite: pass.sat,
          instrument: modis ? 'MODIS' : 'VIIRS',
          confidence: confidenceFor(site.profile, pass.sat, rand),
          brightnessK: round((modis ? 312 : 318) + rand() * (site.profile === 'low' ? 18 : 45), 1),
          frpMW: site.profile === 'missing' ? null : round(site.frp[0] + rand() * (site.frp[1] - site.frp[0]), 1),
          dayNight: localHour >= 6 && localHour < 18 ? 'D' : 'N',
          regionId: site.regionId,
          provenance: 'demo-sample',
        });
      }
    }
  }
  return { observations, siteFirstObservation };
}

/** Seeded review history so the demo opens with alerts in every workflow state. */
export function seedEvents(anchor: Date, siteFirstObservation: Record<string, string>): VerificationEvent[] {
  const at = (hoursAgo: number) => new Date(anchor.getTime() - hoursAgo * 3_600_000).toISOString();
  const alert = (site: string) => `ALT-${siteFirstObservation[site].replace(/^OBS-/, '')}`;
  let n = 0;
  const id = () => `EVT-SEED-${String(++n).padStart(3, '0')}`;
  const base = { seeded: true as const };

  return [
    { ...base, id: id(), alertId: null, at: at(0), actor: 'System', type: 'system',
      note: 'Demo sample dataset generated (synthetic observations, FIRMS-like schema). No live feed connected.' },

    { ...base, id: id(), alertId: alert('od-rourkela'), at: at(45), actor: 'Farhan Qureshi', type: 'assignment', reviewerId: 'rv-fq' },
    { ...base, id: id(), alertId: alert('od-rourkela'), at: at(44.5), actor: 'Farhan Qureshi', type: 'action',
      action: 'Checked against known industrial heat sources' },
    { ...base, id: id(), alertId: alert('od-rourkela'), at: at(44), actor: 'Farhan Qureshi', type: 'status_change',
      fromStatus: 'awaiting', toStatus: 'unconfirmed',
      note: 'Detections coincide with the steel plant footprint; consistent with a persistent industrial heat signature rather than vegetation fire.' },

    { ...base, id: id(), alertId: alert('uk-tehri'), at: at(30), actor: 'Ananya Rawat', type: 'assignment', reviewerId: 'rv-ar' },
    { ...base, id: id(), alertId: alert('uk-tehri'), at: at(29), actor: 'Ananya Rawat', type: 'action',
      action: 'Checked subsequent satellite pass' },
    { ...base, id: id(), alertId: alert('uk-tehri'), at: at(28.5), actor: 'Ananya Rawat', type: 'status_change',
      fromStatus: 'awaiting', toStatus: 'inconclusive',
      note: 'Single low-confidence MODIS detection; follow-up passes cloud-obscured. No corroborating evidence either way.' },

    { ...base, id: id(), alertId: alert('pb-bathinda'), at: at(5), actor: 'Gurpreet Sandhu', type: 'assignment', reviewerId: 'rv-gs' },
    { ...base, id: id(), alertId: alert('pb-bathinda'), at: at(4.5), actor: 'Gurpreet Sandhu', type: 'status_change',
      fromStatus: 'awaiting', toStatus: 'unconfirmed',
      note: 'Pattern matches post-harvest crop-residue burning in cultivated fields; no forest or protected area nearby.' },

    { ...base, id: id(), alertId: alert('uk-pauri'), at: at(5.5), actor: 'Vikram Nair', type: 'assignment', reviewerId: 'rv-vn' },
    { ...base, id: id(), alertId: alert('uk-pauri'), at: at(5), actor: 'Vikram Nair', type: 'action',
      action: 'Reviewed optical / high-resolution imagery' },
    { ...base, id: id(), alertId: alert('uk-pauri'), at: at(4.8), actor: 'Vikram Nair', type: 'status_change',
      fromStatus: 'awaiting', toStatus: 'confirmed',
      note: 'Smoke plume visible on optical imagery over the hotspot; detections recur across four passes inside the forest block.' },

    { ...base, id: id(), alertId: alert('mz-lunglei'), at: at(2.5), actor: 'Lalremruati Sailo', type: 'assignment', reviewerId: 'rv-ls' },
    { ...base, id: id(), alertId: alert('mz-lunglei'), at: at(2.2), actor: 'Lalremruati Sailo', type: 'action',
      action: 'Contacted forest range office' },
    { ...base, id: id(), alertId: alert('mz-lunglei'), at: at(2.1), actor: 'Lalremruati Sailo', type: 'note',
      note: 'Possibly jhum (shifting cultivation) burning spreading into community forest. Awaiting range office reply.' },

    { ...base, id: id(), alertId: alert('mp-kanha'), at: at(1), actor: 'Ananya Rawat', type: 'assignment', reviewerId: 'rv-ar' },
  ];
}
