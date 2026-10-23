import { useCallback, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { REVIEWERS } from '../data/regions';
import { buildReviewEvents, validateReview, type ReviewDraft } from '../lib/verification';
import { fetchLiveDataset, LiveFeedError } from '../lib/firms';
import { saveState, SCHEMA_VERSION } from '../persistence/storage';
import { AppContext, type AppContextValue } from './context';
import {
  DEFAULT_ASSETS,
  applyFilters,
  computeMetrics,
  limitToBounds,
  deriveAlerts,
  observationsFor,
  scopeToRegion,
} from './derive';
import { buildHash, parseHash } from './hash';
import { freshDataset, initState, reducer } from './reducer';
import type { ViewId } from './types';

const REVIEWER_IDS = REVIEWERS.map((r) => r.id);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState);

  const liveObservations = state.dataSource === 'live' ? state.live.dataset?.observations : undefined;
  const observations = useMemo(() => liveObservations ?? observationsFor(state.anchor), [liveObservations, state.anchor]);
  const allAlerts = useMemo(
    () => deriveAlerts(observations, state.events, DEFAULT_ASSETS, new Date(state.scoredAt)),
    [observations, state.events, state.scoredAt],
  );
  const alertById = useMemo(() => new Map(allAlerts.map((a) => [a.id, a])), [allAlerts]);
  const scopedAlerts = useMemo(() => scopeToRegion(allAlerts, state.regionId), [allAlerts, state.regionId]);
  const filteredAlerts = useMemo(
    () => applyFilters(scopedAlerts, state.filters, new Date(state.scoredAt)),
    [scopedAlerts, state.filters, state.scoredAt],
  );
  const visibleAlerts = useMemo(
    () =>
      state.view === 'map' && state.filters.limitToMap ? limitToBounds(filteredAlerts, state.mapBounds) : filteredAlerts,
    [filteredAlerts, state.view, state.filters.limitToMap, state.mapBounds],
  );
  const metrics = useMemo(() => computeMetrics(scopedAlerts), [scopedAlerts]);
  const selectedAlert = state.selectedAlertId ? alertById.get(state.selectedAlertId) ?? null : null;

  // Persist user-owned state whenever it changes.
  useEffect(() => {
    const error = saveState({
      schemaVersion: SCHEMA_VERSION,
      anchor: state.anchor,
      events: state.events,
      actingAs: state.actingAs,
      lastRefreshedAt: state.lastRefreshedAt,
    });
    if (error) dispatch({ type: 'setStorageError', error });
  }, [state.anchor, state.events, state.actingAs, state.lastRefreshedAt]);

  // Keep the view and selected alert in the URL hash, so reloads, back/forward and shared links work.
  // Changing view adds a history entry; changing the selected alert only replaces it.
  useEffect(() => {
    const desired = buildHash(state.view, state.selectedAlertId);
    if (window.location.hash === desired) return;
    if (parseHash(window.location.hash).view !== state.view || !window.location.hash) window.location.hash = desired;
    else window.history.replaceState(null, '', desired);
  }, [state.view, state.selectedAlertId]);
  useEffect(() => {
    const onHash = () => {
      const { view, alertId } = parseHash(window.location.hash);
      dispatch({ type: 'setView', view });
      dispatch({ type: 'select', alertId });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Auto-dismiss toasts.
  useEffect(() => {
    if (!state.toast) return;
    const id = state.toast.id;
    const t = window.setTimeout(() => dispatch({ type: 'clearToast', id }), 3500);
    return () => window.clearTimeout(t);
  }, [state.toast]);

  const saveReview = useCallback(
    (alertId: string, draft: ReviewDraft): string[] => {
      const alert = alertById.get(alertId);
      if (!alert) return ['This alert no longer exists in the current dataset.'];
      const errors = validateReview(alert.verification, draft, REVIEWER_IDS);
      if (errors.length) return errors;
      const events = buildReviewEvents(alertId, alert.verification, draft, state.actingAs, new Date().toISOString());
      dispatch({ type: 'appendEvents', events });
      dispatch({ type: 'toast', message: `Saved ${events.length} review event${events.length === 1 ? '' : 's'} for ${alertId}.`, tone: 'success' });
      return [];
    },
    [alertById, state.actingAs],
  );

  const loadLive = useCallback(async () => {
    dispatch({ type: 'liveRequested' });
    try {
      const dataset = await fetchLiveDataset(1);
      dispatch({ type: 'liveLoaded', dataset, now: new Date().toISOString() });
      const failed = dataset.failedSources.length ? ` ${dataset.failedSources.length} source(s) failed.` : '';
      dispatch({
        type: 'toast',
        message: `Loaded ${dataset.observations.length} NASA FIRMS detections in monitored regions (${dataset.outsideRegions} elsewhere in India not shown).${failed}`,
        tone: dataset.failedSources.length ? 'info' : 'success',
      });
    } catch (e) {
      dispatch({ type: 'liveFailed' });
      dispatch({ type: 'toast', message: e instanceof LiveFeedError ? e.message : 'Live feed failed to load.', tone: 'error' });
    }
  }, []);

  const switchToDemo = useCallback(() => {
    dispatch({ type: 'useDemo' });
    dispatch({ type: 'toast', message: 'Switched to sample data.', tone: 'info' });
  }, []);

  const refresh = useCallback(() => {
    if (state.dataSource === 'live') {
      void loadLive();
      return;
    }
    const now = new Date().toISOString();
    dispatch({ type: 'refresh', now });
    dispatch({ type: 'toast', message: 'Sample data re-scored against the current time.', tone: 'info' });
  }, [state.dataSource, loadLive]);

  const resetDemo = useCallback(() => {
    const now = new Date().toISOString();
    const { events } = freshDataset(now);
    dispatch({ type: 'resetDemo', now, events });
    dispatch({ type: 'toast', message: 'Demo dataset regenerated and review history reset.', tone: 'info' });
  }, []);

  const openAlert = useCallback((alertId: string, view?: ViewId) => {
    if (view) dispatch({ type: 'setView', view });
    dispatch({ type: 'select', alertId });
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      dispatch,
      observations,
      assets: DEFAULT_ASSETS,
      allAlerts,
      scopedAlerts,
      filteredAlerts,
      visibleAlerts,
      metrics,
      selectedAlert,
      alertById,
      actions: { saveReview, refresh, resetDemo, openAlert, loadLive, switchToDemo },
    }),
    [state, observations, allAlerts, scopedAlerts, filteredAlerts, visibleAlerts, metrics, selectedAlert, alertById, saveReview, refresh, resetDemo, openAlert, loadLive, switchToDemo],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
