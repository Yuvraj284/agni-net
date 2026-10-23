import type { VerificationEvent, VerificationState, VerificationStatus } from '../types';

export const STATUS_META: Record<VerificationStatus, { label: string; description: string }> = {
  awaiting: {
    label: 'Awaiting verification',
    description: 'Candidate alert — no human determination yet.',
  },
  confirmed: {
    label: 'Confirmed',
    description: 'A reviewer has verified an active fire incident.',
  },
  unconfirmed: {
    label: 'Unconfirmed',
    description: 'Reviewed; no fire found or the hotspot has another explanation.',
  },
  inconclusive: {
    label: 'Inconclusive',
    description: 'Reviewed; available evidence is insufficient to decide.',
  },
};

export const STATUSES: VerificationStatus[] = ['awaiting', 'confirmed', 'unconfirmed', 'inconclusive'];

/** Recordable reviewer actions. These record what a reviewer did — not outcomes. */
export const REVIEW_ACTIONS = [
  'Checked subsequent satellite pass',
  'Reviewed optical / high-resolution imagery',
  'Checked against known industrial heat sources',
  'Contacted forest range office',
  'Requested field verification',
  'Escalated to district control room',
] as const;

export const INITIAL_STATE: VerificationState = {
  status: 'awaiting',
  reviewerId: null,
  updatedAt: null,
  eventCount: 0,
};

/** Replay events in time order (stable for equal timestamps) to derive the current state. */
export function replay(events: VerificationEvent[]): VerificationState {
  return sortEvents(events).reduce<VerificationState>((state, e) => {
    const next = { ...state, updatedAt: e.at, eventCount: state.eventCount + 1 };
    if (e.type === 'assignment') next.reviewerId = e.reviewerId ?? null;
    if (e.type === 'status_change' && e.toStatus) next.status = e.toStatus;
    return next;
  }, INITIAL_STATE);
}

/** Current state for every alert that has at least one event. */
export function deriveAll(events: VerificationEvent[]): Map<string, VerificationState> {
  const byAlert = new Map<string, VerificationEvent[]>();
  for (const e of events) {
    if (!e.alertId) continue;
    const list = byAlert.get(e.alertId) ?? [];
    list.push(e);
    byAlert.set(e.alertId, list);
  }
  const out = new Map<string, VerificationState>();
  byAlert.forEach((list, id) => out.set(id, replay(list)));
  return out;
}

export function sortEvents(events: VerificationEvent[]): VerificationEvent[] {
  return events
    .map((e, i) => ({ e, i }))
    .sort((a, b) => Date.parse(a.e.at) - Date.parse(b.e.at) || a.i - b.i)
    .map(({ e }) => e);
}

export interface ReviewDraft {
  status: VerificationStatus;
  reviewerId: string | null;
  note: string;
  actions: string[];
}

export const NOTE_MIN_FOR_DETERMINATION = 10;
export const NOTE_MAX = 1000;

export function validateReview(
  current: VerificationState,
  draft: ReviewDraft,
  knownReviewerIds: string[],
): string[] {
  const errors: string[] = [];
  const note = draft.note.trim();
  const statusChanged = draft.status !== current.status;
  const reviewerChanged = draft.reviewerId !== current.reviewerId;

  if (!statusChanged && !reviewerChanged && !note && draft.actions.length === 0) {
    errors.push('Nothing to save — change the status, reviewer, add a note or record an action.');
  }
  if (draft.reviewerId !== null && !knownReviewerIds.includes(draft.reviewerId)) {
    errors.push('Selected reviewer is not on the roster.');
  }
  if (statusChanged && draft.status !== 'awaiting' && note.length < NOTE_MIN_FOR_DETERMINATION) {
    errors.push(`A note of at least ${NOTE_MIN_FOR_DETERMINATION} characters is required to record "${STATUS_META[draft.status].label}".`);
  }
  if (statusChanged && draft.status === 'confirmed' && !draft.reviewerId) {
    errors.push('Assign a reviewer before confirming an incident.');
  }
  if (note.length > NOTE_MAX) errors.push(`Note must be ${NOTE_MAX} characters or fewer.`);
  return errors;
}

let counter = 0;
export function newEventId(at: string): string {
  counter += 1;
  const rand = Math.floor(Math.random() * 36 ** 4).toString(36).padStart(4, '0');
  return `EVT-${Date.parse(at).toString(36)}-${counter.toString(36)}-${rand}`;
}

/**
 * Turn a validated draft into new append-only events. The caller appends them to the log;
 * existing events are never modified or removed.
 */
export function buildReviewEvents(
  alertId: string,
  current: VerificationState,
  draft: ReviewDraft,
  actor: string,
  at: string,
  makeId: (at: string) => string = newEventId,
): VerificationEvent[] {
  const events: VerificationEvent[] = [];
  const note = draft.note.trim();
  const statusChanged = draft.status !== current.status;

  if (draft.reviewerId !== current.reviewerId) {
    events.push({ id: makeId(at), alertId, at, actor, type: 'assignment', reviewerId: draft.reviewerId });
  }
  for (const action of draft.actions) {
    events.push({ id: makeId(at), alertId, at, actor, type: 'action', action });
  }
  if (statusChanged) {
    events.push({
      id: makeId(at),
      alertId,
      at,
      actor,
      type: 'status_change',
      fromStatus: current.status,
      toStatus: draft.status,
      ...(note ? { note } : {}),
    });
  } else if (note) {
    events.push({ id: makeId(at), alertId, at, actor, type: 'note', note });
  }
  return events;
}

export function appendEvents(log: VerificationEvent[], added: VerificationEvent[]): VerificationEvent[] {
  return [...log, ...added];
}
