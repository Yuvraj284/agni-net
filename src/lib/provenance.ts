import type { EnrichedAlert } from '../types';

/** True when an alert is built from NASA FIRMS detections rather than the synthetic sample. */
export const isLiveAlert = (alert: Pick<EnrichedAlert, 'observations'>) =>
  alert.observations.some((o) => o.provenance === 'firms-nrt');
