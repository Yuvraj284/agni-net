import { describe, expect, it } from 'vitest';
import { SCORING_CONFIG, type ScoringConfig } from '../config/scoring';
import type { Asset, CandidateAlert, Observation } from '../types';
import { bandFor, normaliseConfidence, scoreAlert, validateWeights } from './scoring';

const NOW = new Date('2026-03-01T12:00:00Z');

function obs(partial: Partial<Observation> = {}): Observation {
  return {
    id: 'OBS-T-001',
    lat: 22,
    lon: 80,
    observedAt: NOW.toISOString(),
    satellite: 'Suomi NPP',
    instrument: 'VIIRS',
    confidence: { scheme: 'viirs-category', value: 'high' },
    brightnessK: 340,
    frpMW: 20,
    dayNight: 'D',
    regionId: 'mp',
    provenance: 'demo-sample',
    ...partial,
  };
}

function alertFor(observations: Observation[], distinctPasses = 1): CandidateAlert {
  return {
    id: 'ALT-T-001',
    regionId: 'mp',
    observationIds: observations.map((o) => o.id),
    centroid: [observations[0].lat, observations[0].lon],
    firstObservedAt: observations[0].observedAt,
    lastObservedAt: observations[observations.length - 1].observedAt,
    distinctPasses,
    extentKm: 0,
  };
}

const polygon: Asset = {
  id: 'as-test',
  name: 'Test reserve',
  type: 'protected_area',
  regionId: 'mp',
  geometry: 'polygon',
  ring: [[21.9, 79.9], [21.9, 80.1], [22.1, 80.1], [22.1, 79.9]],
  description: '',
  illustrative: true,
};

describe('priority score', () => {
  it('uses weights that sum to 1', () => {
    expect(validateWeights()).toBe(true);
    expect(validateWeights({ ...SCORING_CONFIG, weights: { C: 0.5, R: 0.5, F: 0.5, A: 0 } })).toBe(false);
  });

  it('computes P = 0.35C + 0.25R + 0.20F + 0.20A', () => {
    // C = 90 (VIIRS high), R = 100 (just observed), F = 50 (3 passes), A = 100 (inside polygon)
    const o = [obs()];
    const s = scoreAlert(alertFor(o, 3), o, [polygon], NOW);
    expect(s.factors.C.value).toBe(90);
    expect(s.factors.R.value).toBeCloseTo(100);
    expect(s.factors.F.value).toBe(50);
    expect(s.factors.A.value).toBe(100);
    expect(s.score).toBeCloseTo(0.35 * 90 + 0.25 * 100 + 0.2 * 50 + 0.2 * 100, 1);
    expect(s.incomplete).toBe(false);
    expect(s.upperBound).toBe(s.score);
  });

  it('respects configurable weights', () => {
    const config: ScoringConfig = { ...SCORING_CONFIG, weights: { C: 1, R: 0, F: 0, A: 0 } };
    const o = [obs()];
    expect(scoreAlert(alertFor(o), o, [polygon], NOW, config).score).toBe(90);
  });

  it('halves recency every 12 hours of observation age', () => {
    const o = [obs({ observedAt: new Date(NOW.getTime() - 12 * 3_600_000).toISOString() })];
    expect(scoreAlert(alertFor(o), o, [polygon], NOW).factors.R.value).toBeCloseTo(50);
    const o2 = [obs({ observedAt: new Date(NOW.getTime() - 24 * 3_600_000).toISOString() })];
    expect(scoreAlert(alertFor(o2), o2, [polygon], NOW).factors.R.value).toBeCloseTo(25);
  });

  it('scales recurrence by distinct passes, saturating at 5', () => {
    const o = [obs()];
    const f = (passes: number) => scoreAlert(alertFor(o, passes), o, [], NOW).factors.F.value;
    expect(f(1)).toBe(0);
    expect(f(2)).toBe(25);
    expect(f(5)).toBe(100);
    expect(f(9)).toBe(100);
  });

  it('decays proximity linearly to 0 at 10 km and ignores heat sources', () => {
    const point: Asset = { ...polygon, id: 'pt', type: 'infrastructure', geometry: 'point', location: [22.045, 80] } as Asset;
    const o = [obs()]; // ~5 km south of the point
    const a = scoreAlert(alertFor(o), o, [point], NOW).factors.A.value!;
    expect(a).toBeGreaterThan(45);
    expect(a).toBeLessThan(55);

    const heat: Asset = { ...point, id: 'heat', type: 'industrial_heat_source', location: [22.001, 80] } as Asset;
    const s = scoreAlert(alertFor(o), o, [heat], NOW);
    expect(s.factors.A.value).toBe(0);
    expect(s.proximity.heatSource?.asset.id).toBe('heat');
  });

  it('treats missing confidence explicitly instead of assuming a value', () => {
    const o = [obs({ confidence: { scheme: 'missing' } })];
    const s = scoreAlert(alertFor(o), o, [polygon], NOW);
    expect(s.factors.C.value).toBeNull();
    expect(s.factors.C.status).toBe('missing');
    expect(s.factors.C.contribution).toBe(0);
    expect(s.incomplete).toBe(true);
    expect(s.upperBound).toBeCloseTo(s.score + 35, 1);
  });

  it('marks out-of-range MODIS confidence as incomparable', () => {
    expect(normaliseConfidence({ scheme: 'modis-percent', value: 140 }).status).toBe('incomparable');
    expect(normaliseConfidence({ scheme: 'modis-percent', value: Number.NaN }).value).toBeNull();
    expect(normaliseConfidence({ scheme: 'modis-percent', value: 72 }).value).toBe(72);
  });

  it('treats future-stamped observations as incomparable recency', () => {
    const o = [obs({ observedAt: new Date(NOW.getTime() + 2 * 3_600_000).toISOString() })];
    const s = scoreAlert(alertFor(o), o, [polygon], NOW);
    expect(s.factors.R.status).toBe('incomparable');
    expect(s.factors.R.contribution).toBe(0);
    expect(s.incomplete).toBe(true);
  });

  it('flags proximity as missing when no assets are loaded', () => {
    const o = [obs()];
    expect(scoreAlert(alertFor(o), o, [], NOW).factors.A.status).toBe('missing');
  });

  it('maps scores to priority bands', () => {
    expect(bandFor(80)).toBe('critical');
    expect(bandFor(60)).toBe('high');
    expect(bandFor(45)).toBe('medium');
    expect(bandFor(10)).toBe('low');
  });
});
