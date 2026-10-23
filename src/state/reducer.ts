import { DEFAULT_ACTOR } from '../data/regions';
import { generateObservations, seedEvents } from '../data/observations';
import { loadState } from '../persistence/storage';
import { appendEvents } from '../lib/verification';
import { DEFAULT_FILTERS, VIEWS, type Action, type AppState, type ViewId } from './types';

export function viewFromHash(hash: string): ViewId {
  const v = hash.replace(/^#\/?/, '') as ViewId;
  return VIEWS.includes(v) ? v : 'overview';
}

/** Build the initial state from storage, falling back to a freshly generated demo dataset. */
export function initState(): AppState {
  const { state: saved, error } = loadState();
  const now = new Date().toISOString();
  const base = {
    view: viewFromHash(typeof window !== 'undefined' ? window.location.hash : ''),
    regionId: 'all' as const,
    selectedAlertId: null,
    filters: DEFAULT_FILTERS,
    mapBounds: null,
    storageError: error,
    toast: null,
    scoredAt: now,
  };
  if (saved) {
    return { ...base, anchor: saved.anchor, events: saved.events, actingAs: saved.actingAs, lastRefreshedAt: saved.lastRefreshedAt };
  }
  return { ...base, ...freshDataset(now), actingAs: DEFAULT_ACTOR, lastRefreshedAt: now };
}

export function freshDataset(now: string) {
  const anchor = new Date(now);
  const { siteFirstObservation } = generateObservations(anchor);
  return { anchor: now, events: seedEvents(anchor, siteFirstObservation) };
}

let toastId = 0;

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setView':
      return { ...state, view: action.view };
    case 'setRegion':
      return { ...state, regionId: action.regionId, mapBounds: null };
    case 'select':
      return { ...state, selectedAlertId: action.alertId };
    case 'setFilters':
      return { ...state, filters: { ...state.filters, ...action.filters } };
    case 'resetFilters':
      return { ...state, filters: { ...DEFAULT_FILTERS, sort: state.filters.sort } };
    case 'appendEvents':
      return { ...state, events: appendEvents(state.events, action.events) };
    case 'refresh':
      return { ...state, scoredAt: action.now, lastRefreshedAt: action.now };
    case 'setActingAs':
      return { ...state, actingAs: action.actor };
    case 'setMapBounds':
      return { ...state, mapBounds: action.bounds };
    case 'resetDemo':
      return {
        ...state,
        anchor: action.now,
        events: action.events,
        scoredAt: action.now,
        lastRefreshedAt: action.now,
        selectedAlertId: null,
        filters: DEFAULT_FILTERS,
      };
    case 'setStorageError':
      return { ...state, storageError: action.error };
    case 'toast':
      return { ...state, toast: { id: ++toastId, message: action.message, tone: action.tone } };
    case 'clearToast':
      return state.toast?.id === action.id ? { ...state, toast: null } : state;
  }
}
