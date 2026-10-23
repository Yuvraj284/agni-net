import { useCallback, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { REVIEWERS } from '../data/regions';
import { buildReviewEvents, validateReview, type ReviewDraft } from '../lib/verification';
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
import { freshDataset, initState, reducer, viewFromHash } from './reducer';
import type { ViewId } from './types';

const REVIEWER_IDS = REVIEWERS.map((r) => r.id);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState);

  const observations = useMemo(() => observationsFor(state.anchor), [state.anchor]);
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

  // Keep the view in the URL hash so browser back/forward and reloads work.
  useEffect(() => {
    if (viewFromHash(window.location.hash) !== state.view || !window.location.hash) {
      window.location.hash = `/${state.view}`;
    }
  }, [state.view]);
  useEffect(() => {
    const onHash = () => dispatch({ type: 'setView', view: viewFromHash(window.location.hash) });
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

  const refresh = useCallback(() => {
    const now = new Date().toISOString();
    dispatch({ type: 'refresh', now });
    dispatch({ type: 'toast', message: 'Sample data re-scored against the current time. No live feed is connected.', tone: 'info' });
  }, []);

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
      actions: { saveReview, refresh, resetDemo, openAlert },
    }),
    [state, observations, allAlerts, scopedAlerts, filteredAlerts, visibleAlerts, metrics, selectedAlert, alertById, saveReview, refresh, resetDemo, openAlert],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
