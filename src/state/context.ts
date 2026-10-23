import { createContext, type Dispatch } from 'react';
import type { Asset, EnrichedAlert, Observation } from '../types';
import type { ReviewDraft } from '../lib/verification';
import type { Metrics } from './derive';
import type { Action, AppState } from './types';

export interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  observations: Observation[];
  assets: Asset[];
  /** Every candidate alert, all regions. */
  allAlerts: EnrichedAlert[];
  /** Alerts in the selected region (drives metric cards). */
  scopedAlerts: EnrichedAlert[];
  /** Region + filters + sort applied (drives the map). */
  filteredAlerts: EnrichedAlert[];
  /** filteredAlerts, additionally limited to the map view when that toggle is on (drives queues). */
  visibleAlerts: EnrichedAlert[];
  metrics: Metrics;
  selectedAlert: EnrichedAlert | null;
  alertById: Map<string, EnrichedAlert>;
  actions: {
    saveReview: (alertId: string, draft: ReviewDraft) => string[];
    refresh: () => void;
    resetDemo: () => void;
    openAlert: (alertId: string, view?: AppState['view']) => void;
  };
}

export const AppContext = createContext<AppContextValue | null>(null);
