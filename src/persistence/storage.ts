import type { VerificationEvent } from '../types';

/**
 * LocalStorage persistence for the demo.
 *
 * Only *user-owned* state is stored: the dataset anchor time, the append-only verification
 * event log, the acting reviewer and the last refresh time. Observations, alerts and scores
 * are always re-derived from code so they can never drift out of sync with each other.
 */

export const STORAGE_KEY = 'agninet:v1';
const CORRUPT_BACKUP_KEY = 'agninet:v1:corrupt-backup';
export const SCHEMA_VERSION = 1;

export interface PersistedState {
  schemaVersion: typeof SCHEMA_VERSION;
  anchor: string;
  events: VerificationEvent[];
  actingAs: string;
  lastRefreshedAt: string;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

const EVENT_TYPES = new Set(['assignment', 'status_change', 'note', 'action', 'system']);

function isEvent(v: unknown): v is VerificationEvent {
  if (!v || typeof v !== 'object') return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    (typeof e.alertId === 'string' || e.alertId === null) &&
    typeof e.at === 'string' &&
    Number.isFinite(Date.parse(e.at)) &&
    typeof e.actor === 'string' &&
    typeof e.type === 'string' &&
    EVENT_TYPES.has(e.type)
  );
}

export function parsePersisted(raw: string): PersistedState | null {
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    if (
      v?.schemaVersion !== SCHEMA_VERSION ||
      typeof v.anchor !== 'string' ||
      !Number.isFinite(Date.parse(v.anchor)) ||
      !Array.isArray(v.events) ||
      !v.events.every(isEvent) ||
      typeof v.actingAs !== 'string' ||
      typeof v.lastRefreshedAt !== 'string'
    ) {
      return null;
    }
    return v as unknown as PersistedState;
  } catch {
    return null;
  }
}

export interface LoadResult {
  state: PersistedState | null;
  error: string | null;
}

export function loadState(storage: StorageLike | null = defaultStorage()): LoadResult {
  if (!storage) return { state: null, error: 'Browser storage is unavailable — changes will not persist this session.' };
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { state: null, error: 'Browser storage could not be read — changes will not persist this session.' };
  }
  if (raw === null) return { state: null, error: null };
  const state = parsePersisted(raw);
  if (!state) {
    try {
      storage.setItem(CORRUPT_BACKUP_KEY, raw);
    } catch {
      /* best effort */
    }
    return {
      state: null,
      error: `Saved demo data was unreadable and has been reset. The original was backed up under "${CORRUPT_BACKUP_KEY}".`,
    };
  }
  return { state, error: null };
}

export function saveState(state: PersistedState, storage: StorageLike | null = defaultStorage()): string | null {
  if (!storage) return 'Browser storage is unavailable — changes will not persist.';
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return null;
  } catch {
    return 'Could not save to browser storage (quota exceeded or blocked). Recent changes may not persist.';
  }
}

export function clearState(storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
