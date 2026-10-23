import { SCORING_CONFIG, type ScoringConfig } from '../config/scoring';
import type {
  Asset,
  CandidateAlert,
  ConfidenceReading,
  FactorKey,
  FactorResult,
  Observation,
  PriorityBand,
  ScoreResult,
} from '../types';
import { distanceToAssetKm } from './geo';

/**
 * Prototype priority score:  P = 0.35·C + 0.25·R + 0.20·F + 0.20·A   (weights in config)
 *
 * Normalisation rules (all to 0–100):
 *
 * C — detection confidence. Per observation: VIIRS low/nominal/high → 30/65/90 (prototype
 *     mapping); MODIS percent used as-is when it is a finite number in 0–100. The alert takes
 *     the MAX across its observations (the most confident detection). If no observation has a
 *     usable value, C is `missing` (no confidence reported) or `incomparable` (values present
 *     but invalid) and contributes 0.
 *
 * R — recency, from observation time (not ingest time). Age is measured from the most recent
 *     valid observation; R = 100 · 0.5^(ageHours / halfLifeHours), half-life 12 h.
 *     Observations stamped more than 15 min in the future, or with unparseable times, are
 *     excluded; if none remain R is `incomparable`.
 *
 * F — recurrence. Counts distinct overpasses (satellite + acquisition minute), so adjacent
 *     pixels from one pass do not inflate it. F = 100 · min(1, (passes − 1) / (saturation − 1));
 *     one pass → 0, five or more → 100.
 *
 * A — proximity to a mapped asset. For each asset: sensitivity(type) · 100 · max(0, 1 − d / 10 km),
 *     where d is the minimum distance from any member observation to the asset (0 inside a
 *     polygon). A takes the max over assets. Known industrial heat sources have sensitivity 0
 *     (they never raise priority) but are flagged to reviewers. With no assets loaded, A is `missing`.
 *
 * Missing / incomparable factors contribute 0, so `score` is a lower bound; `upperBound` shows
 * what the score could be if those factors were at 100, and the alert is marked `incomplete`.
 */

const LABELS: Record<FactorKey, string> = {
  C: 'Detection confidence',
  R: 'Recency',
  F: 'Recurrence',
  A: 'Asset proximity',
};

type Normalised = { value: number | null; status: FactorResult['status']; explanation: string };

export function normaliseConfidence(
  reading: ConfidenceReading,
  config: ScoringConfig = SCORING_CONFIG,
): { value: number | null; status: FactorResult['status'] } {
  switch (reading.scheme) {
    case 'viirs-category':
      return { value: config.confidence.viirsCategory[reading.value], status: 'ok' };
    case 'modis-percent':
      if (Number.isFinite(reading.value) && reading.value >= 0 && reading.value <= 100) {
        return { value: reading.value, status: 'ok' };
      }
      return { value: null, status: 'incomparable' };
    case 'missing':
      return { value: null, status: 'missing' };
  }
}

function scoreConfidence(observations: Observation[], config: ScoringConfig): Normalised {
  const results = observations.map((o) => normaliseConfidence(o.confidence, config));
  const valid = results.filter((r) => r.value !== null).map((r) => r.value as number);
  if (valid.length === 0) {
    const anyInvalid = results.some((r) => r.status === 'incomparable');
    return {
      value: null,
      status: anyInvalid ? 'incomparable' : 'missing',
      explanation: anyInvalid
        ? 'Confidence values present but outside the valid range — not used.'
        : 'No observation reported a confidence value.',
    };
  }
  const max = Math.max(...valid);
  const skipped = observations.length - valid.length;
  return {
    value: max,
    status: 'ok',
    explanation:
      `Max normalised confidence across ${valid.length} observation${valid.length === 1 ? '' : 's'}` +
      (skipped ? ` (${skipped} without usable confidence ignored).` : '.'),
  };
}

function scoreRecency(observations: Observation[], now: Date, config: ScoringConfig): Normalised {
  const nowMs = now.getTime();
  const toleranceMs = config.recency.futureToleranceMinutes * 60_000;
  const times = observations.map((o) => Date.parse(o.observedAt));
  const usable = times.filter((t) => Number.isFinite(t) && t <= nowMs + toleranceMs);
  const excluded = times.length - usable.length;
  if (usable.length === 0) {
    return {
      value: null,
      status: 'incomparable',
      explanation: 'No observation time is valid relative to the scoring clock (missing or in the future).',
    };
  }
  const latest = Math.max(...usable);
  const ageHours = Math.max(0, nowMs - latest) / 3_600_000;
  const value = 100 * 0.5 ** (ageHours / config.recency.halfLifeHours);
  return {
    value,
    status: 'ok',
    explanation:
      `Latest observation ${ageHours.toFixed(1)} h ago; halves every ${config.recency.halfLifeHours} h.` +
      (excluded ? ` ${excluded} observation(s) with invalid/future time excluded.` : ''),
  };
}

function scoreRecurrence(distinctPasses: number, config: ScoringConfig): Normalised {
  const sat = config.recurrence.saturationPasses;
  const value = 100 * Math.min(1, Math.max(0, distinctPasses - 1) / (sat - 1));
  return {
    value,
    status: 'ok',
    explanation: `${distinctPasses} distinct overpass${distinctPasses === 1 ? '' : 'es'}; saturates at ${sat}.`,
  };
}

export interface ProximityDetail extends Normalised {
  nearest: { asset: Asset; distanceKm: number } | null;
  heatSource: { asset: Asset; distanceKm: number } | null;
}

export function scoreProximity(
  observations: Observation[],
  assets: Asset[],
  config: ScoringConfig = SCORING_CONFIG,
): ProximityDetail {
  if (assets.length === 0) {
    return {
      value: null,
      status: 'missing',
      explanation: 'No mapped assets loaded — proximity cannot be assessed.',
      nearest: null,
      heatSource: null,
    };
  }
  const { decayKm, sensitivity, heatSourceFlagKm } = config.proximity;
  let best = { value: 0, asset: null as Asset | null, distanceKm: Infinity };
  let nearest: ProximityDetail['nearest'] = null;
  let heatSource: ProximityDetail['heatSource'] = null;

  for (const asset of assets) {
    const d = Math.min(...observations.map((o) => distanceToAssetKm([o.lat, o.lon], asset)));
    if (asset.type === 'industrial_heat_source') {
      if (d <= heatSourceFlagKm && (!heatSource || d < heatSource.distanceKm)) heatSource = { asset, distanceKm: d };
      continue;
    }
    if (!nearest || d < nearest.distanceKm) nearest = { asset, distanceKm: d };
    const value = sensitivity[asset.type] * 100 * Math.max(0, 1 - d / decayKm);
    if (value > best.value) best = { value, asset, distanceKm: d };
  }

  const explanation = best.asset
    ? best.distanceKm === 0
      ? `Inside ${best.asset.name} (sensitivity ×${sensitivity[best.asset.type]}).`
      : `${best.distanceKm.toFixed(1)} km from ${best.asset.name}; decays to 0 at ${decayKm} km.`
    : `No mapped asset within ${decayKm} km.`;

  return { value: best.value, status: 'ok', explanation, nearest, heatSource };
}

function factor(key: FactorKey, weight: number, n: Normalised): FactorResult {
  const value = n.value === null ? null : Math.max(0, Math.min(100, n.value));
  return {
    key,
    label: LABELS[key],
    weight,
    value,
    contribution: value === null ? 0 : weight * value,
    status: n.status,
    explanation: n.explanation,
  };
}

export function scoreAlert(
  alert: CandidateAlert,
  observations: Observation[],
  assets: Asset[],
  now: Date,
  config: ScoringConfig = SCORING_CONFIG,
): ScoreResult & { proximity: ProximityDetail } {
  const w = config.weights;
  const proximity = scoreProximity(observations, assets, config);
  const factors: Record<FactorKey, FactorResult> = {
    C: factor('C', w.C, scoreConfidence(observations, config)),
    R: factor('R', w.R, scoreRecency(observations, now, config)),
    F: factor('F', w.F, scoreRecurrence(alert.distinctPasses, config)),
    A: factor('A', w.A, proximity),
  };
  const all = Object.values(factors);
  const score = all.reduce((s, f) => s + f.contribution, 0);
  const upperBound = all.reduce((s, f) => s + (f.value === null ? f.weight * 100 : f.contribution), 0);
  return {
    score: round1(score),
    upperBound: round1(upperBound),
    incomplete: all.some((f) => f.value === null),
    factors,
    proximity,
  };
}

export function bandFor(score: number, config: ScoringConfig = SCORING_CONFIG): PriorityBand {
  if (score >= config.bands.critical) return 'critical';
  if (score >= config.bands.high) return 'high';
  if (score >= config.bands.medium) return 'medium';
  return 'low';
}

export function validateWeights(config: ScoringConfig = SCORING_CONFIG): boolean {
  const sum = Object.values(config.weights).reduce((a, b) => a + b, 0);
  return Math.abs(sum - 1) < 1e-9 && Object.values(config.weights).every((v) => v >= 0);
}

const round1 = (n: number) => Math.round(n * 10) / 10;
