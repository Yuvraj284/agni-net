/**
 * Prototype priority-scoring configuration.
 *
 *   P = wC·C + wR·R + wF·F + wA·A        (default 0.35 / 0.25 / 0.20 / 0.20)
 *
 * Every input is normalised to 0–100 by the rules in `src/lib/scoring.ts`.
 * P is a *triage priority*, not a probability that a fire exists.
 * Change the numbers here to re-tune; weights must sum to 1.
 */
export interface ScoringConfig {
  weights: { C: number; R: number; F: number; A: number };
  confidence: {
    /** Prototype mapping of VIIRS categories onto the 0–100 scale. */
    viirsCategory: { low: number; nominal: number; high: number };
  };
  recency: {
    /** R halves every `halfLifeHours` since the most recent observation. */
    halfLifeHours: number;
    /** Observations later than now + tolerance are treated as incomparable (clock skew / bad data). */
    futureToleranceMinutes: number;
  };
  recurrence: {
    /** Distinct overpasses at which F saturates at 100. One pass → F = 0. */
    saturationPasses: number;
  };
  proximity: {
    /** Distance at which the proximity contribution decays to 0. */
    decayKm: number;
    /** Multiplier per asset type. 0 means the type never raises priority. */
    sensitivity: {
      protected_area: number;
      forest: number;
      infrastructure: number;
      settlement: number;
      industrial_heat_source: number;
    };
    /** Distance within which a known industrial heat source is flagged to reviewers. */
    heatSourceFlagKm: number;
  };
  bands: { critical: number; high: number; medium: number };
}

export const SCORING_CONFIG: ScoringConfig = {
  weights: { C: 0.35, R: 0.25, F: 0.2, A: 0.2 },
  confidence: {
    viirsCategory: { low: 30, nominal: 65, high: 90 },
  },
  recency: {
    halfLifeHours: 12,
    futureToleranceMinutes: 15,
  },
  recurrence: {
    saturationPasses: 5,
  },
  proximity: {
    decayKm: 10,
    sensitivity: {
      protected_area: 1,
      forest: 0.85,
      infrastructure: 1,
      settlement: 0.9,
      industrial_heat_source: 0,
    },
    heatSourceFlagKm: 2,
  },
  bands: { critical: 75, high: 60, medium: 40 },
};

/** Candidate-alert grouping rule (see `src/lib/alerts.ts`). */
export const GROUPING_CONFIG = {
  /** Observations within this distance of any member join the same alert (single linkage). */
  linkKm: 1.5,
};
