import type { LiveDataset } from '../lib/firms';
import type { PriorityBand, RegionId, VerificationEvent, VerificationStatus } from '../types';

export type ViewId = 'overview' | 'map' | 'alerts' | 'assets' | 'activity';
export const VIEWS: ViewId[] = ['overview', 'map', 'alerts', 'assets', 'activity'];

export type TimeWindow = 'all' | '6h' | '24h' | '72h';
export type ConfidenceFilter = 'all' | 'high' | 'nominal' | 'low' | 'unknown';
export type SortKey = 'priority' | 'recent' | 'confidence' | 'observations' | 'status';

export interface Filters {
  window: TimeWindow;
  confidence: ConfidenceFilter;
  /** Empty = all statuses. */
  statuses: VerificationStatus[];
  /** Empty = all bands. */
  bands: PriorityBand[];
  search: string;
  sort: SortKey;
  /** Live Map only: limit the queue to alerts with an observation inside the current map view. */
  limitToMap: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  window: 'all',
  confidence: 'all',
  statuses: [],
  bands: [],
  search: '',
  sort: 'priority',
  limitToMap: false,
};

export type Bounds = [[number, number], [number, number]];

export interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'error' | 'info';
}

/** 'demo' = synthetic sample data; 'live' = NASA FIRMS detections fetched through the proxy. */
export type DataSource = 'demo' | 'live';

export interface LiveState {
  status: 'idle' | 'loading' | 'ready';
  dataset: LiveDataset | null;
}

export interface AppState {
  /** Not persisted: every session starts on sample data. */
  dataSource: DataSource;
  live: LiveState;
  anchor: string;
  events: VerificationEvent[];
  actingAs: string;
  lastRefreshedAt: string;
  /** Clock used for recency scoring; advanced by the refresh control. */
  scoredAt: string;
  view: ViewId;
  regionId: RegionId | 'all';
  selectedAlertId: string | null;
  filters: Filters;
  mapBounds: Bounds | null;
  storageError: string | null;
  toast: Toast | null;
}

export type Action =
  | { type: 'setView'; view: ViewId }
  | { type: 'setRegion'; regionId: RegionId | 'all' }
  | { type: 'select'; alertId: string | null }
  | { type: 'setFilters'; filters: Partial<Filters> }
  | { type: 'resetFilters' }
  | { type: 'appendEvents'; events: VerificationEvent[] }
  | { type: 'refresh'; now: string }
  | { type: 'setActingAs'; actor: string }
  | { type: 'setMapBounds'; bounds: Bounds | null }
  | { type: 'resetDemo'; now: string; events: VerificationEvent[] }
  | { type: 'setStorageError'; error: string | null }
  | { type: 'toast'; message: string; tone: Toast['tone'] }
  | { type: 'clearToast'; id: number }
  | { type: 'liveRequested' }
  | { type: 'liveLoaded'; dataset: LiveDataset; now: string }
  | { type: 'liveFailed' }
  | { type: 'useDemo' };
