/**
 * Core domain types.
 *
 * AgniNet keeps three layers strictly separate:
 *   1. Observation       — a raw satellite thermal-hotspot detection (immutable input).
 *   2. CandidateAlert    — a derived grouping of nearby observations that may warrant review.
 *   3. VerificationEvent — an append-only, timestamped human review record about an alert.
 *
 * A "verified incident" is a candidate alert whose latest human status is `confirmed`.
 * Nothing in this file represents a confirmed fire by itself.
 */

export type RegionId = 'uk' | 'mp' | 'od' | 'mz' | 'pb';

export interface Region {
  id: RegionId;
  name: string;
  state: string;
  center: [number, number];
  /** [[south, west], [north, east]] */
  bounds: [[number, number], [number, number]];
  zoom: number;
}

export type Instrument = 'VIIRS' | 'MODIS';
export type Satellite = 'Suomi NPP' | 'NOAA-20' | 'NOAA-21' | 'Aqua' | 'Terra';

/**
 * Confidence is reported differently per instrument (FIRMS-style conventions):
 * VIIRS uses categories, MODIS uses a 0–100 percentage. The scoring engine
 * normalises both, and treats `missing` explicitly instead of guessing a value.
 */
export type ConfidenceReading =
  | { scheme: 'viirs-category'; value: 'low' | 'nominal' | 'high' }
  | { scheme: 'modis-percent'; value: number }
  | { scheme: 'missing' };

export interface Observation {
  id: string;
  lat: number;
  lon: number;
  /** ISO-8601 UTC acquisition time. */
  observedAt: string;
  satellite: Satellite;
  instrument: Instrument;
  confidence: ConfidenceReading;
  /** VIIRS I-4 or MODIS band-21 brightness temperature in Kelvin, when available. */
  brightnessK: number | null;
  /** Fire radiative power in MW, when available. */
  frpMW: number | null;
  dayNight: 'D' | 'N';
  regionId: RegionId;
  /** Every seeded record is labelled as demo data; there is no live feed. */
  provenance: 'demo-sample';
}

export type AssetType =
  | 'protected_area'
  | 'forest'
  | 'infrastructure'
  | 'settlement'
  | 'industrial_heat_source';

interface AssetBase {
  id: string;
  name: string;
  type: AssetType;
  regionId: RegionId;
  description: string;
  /** All sample boundaries are illustrative approximations, not survey data. */
  illustrative: true;
}

export interface PolygonAsset extends AssetBase {
  geometry: 'polygon';
  /** Ring of [lat, lon] vertices (not closed — the last vertex connects to the first). */
  ring: [number, number][];
}

export interface PointAsset extends AssetBase {
  geometry: 'point';
  location: [number, number];
}

export type Asset = PolygonAsset | PointAsset;

export interface CandidateAlert {
  id: string;
  regionId: RegionId;
  observationIds: string[];
  centroid: [number, number];
  firstObservedAt: string;
  lastObservedAt: string;
  /** Number of distinct satellite overpasses (satellite + acquisition minute). */
  distinctPasses: number;
  /** Max distance from centroid to any member observation, in km. */
  extentKm: number;
}

export type FactorKey = 'C' | 'R' | 'F' | 'A';
export type FactorStatus = 'ok' | 'missing' | 'incomparable';

export interface FactorResult {
  key: FactorKey;
  label: string;
  weight: number;
  /** Normalised 0–100 value, or null when the input was missing/incomparable. */
  value: number | null;
  /** weight × value (0 when value is null). */
  contribution: number;
  status: FactorStatus;
  explanation: string;
}

export interface ScoreResult {
  /** Lower-bound priority score, 0–100. Missing factors contribute 0. */
  score: number;
  /** Score if every missing factor had been 100. Equal to `score` when complete. */
  upperBound: number;
  incomplete: boolean;
  factors: Record<FactorKey, FactorResult>;
}

export type VerificationStatus = 'awaiting' | 'confirmed' | 'unconfirmed' | 'inconclusive';

export interface Reviewer {
  id: string;
  name: string;
  role: string;
}

export type VerificationEventType = 'assignment' | 'status_change' | 'note' | 'action' | 'system';

export interface VerificationEvent {
  id: string;
  /** null for system-level events (e.g. data refresh). */
  alertId: string | null;
  at: string;
  /** Display name of whoever recorded the event. */
  actor: string;
  type: VerificationEventType;
  fromStatus?: VerificationStatus;
  toStatus?: VerificationStatus;
  reviewerId?: string | null;
  note?: string;
  action?: string;
  /** True for events that ship with the demo dataset. */
  seeded?: boolean;
}

/** Current verification state, derived by replaying events — never stored directly. */
export interface VerificationState {
  status: VerificationStatus;
  reviewerId: string | null;
  updatedAt: string | null;
  eventCount: number;
}

export type PriorityBand = 'critical' | 'high' | 'medium' | 'low';

export interface EnrichedAlert extends CandidateAlert {
  observations: Observation[];
  score: ScoreResult;
  band: PriorityBand;
  verification: VerificationState;
  regionName: string;
  nearestAsset: { asset: Asset; distanceKm: number } | null;
  nearHeatSource: { asset: Asset; distanceKm: number } | null;
}
