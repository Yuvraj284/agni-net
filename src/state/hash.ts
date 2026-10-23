import { VIEWS, type ViewId } from './types';

/**
 * URL hash routing: `#/<view>` or `#/<view>/<alert id>`, so a specific alert can be linked to.
 * Alert ids are validated so arbitrary hash text never reaches the state.
 */
const ALERT_ID = /^ALT-[A-Za-z0-9-]{1,40}$/;

export function parseHash(hash: string): { view: ViewId; alertId: string | null } {
  const [rawView = '', rawAlert = ''] = hash.replace(/^#\/?/, '').split('/');
  const view = VIEWS.includes(rawView as ViewId) ? (rawView as ViewId) : 'overview';
  const alertId = ALERT_ID.test(decodeURIComponent(rawAlert)) ? decodeURIComponent(rawAlert) : null;
  return { view, alertId };
}

export function buildHash(view: ViewId, alertId: string | null): string {
  return `#/${view}${alertId ? `/${encodeURIComponent(alertId)}` : ''}`;
}

/** Absolute link to an alert in the current app, for sharing. */
export function alertLink(view: ViewId, alertId: string, location: Pick<Location, 'origin' | 'pathname' | 'search'>): string {
  return `${location.origin}${location.pathname}${location.search}${buildHash(view, alertId)}`;
}
