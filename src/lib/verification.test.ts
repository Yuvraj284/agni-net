import { describe, expect, it } from 'vitest';
import type { VerificationEvent } from '../types';
import { INITIAL_STATE, appendEvents, buildReviewEvents, deriveAll, replay, validateReview, type ReviewDraft } from './verification';

const REVIEWERS = ['rv-a', 'rv-b'];
let n = 0;
const makeId = () => `E${++n}`;

function save(log: VerificationEvent[], alertId: string, draft: ReviewDraft, at: string) {
  const current = replay(log.filter((e) => e.alertId === alertId));
  const errors = validateReview(current, draft, REVIEWERS);
  if (errors.length) throw new Error(errors.join('; '));
  return appendEvents(log, buildReviewEvents(alertId, current, draft, 'Tester', at, makeId));
}

describe('verification workflow', () => {
  it('starts every alert as awaiting and unassigned', () => {
    expect(replay([])).toEqual(INITIAL_STATE);
  });

  it('records assignment, status, actions and notes as separate events', () => {
    const log = save(
      [],
      'ALT-1',
      { status: 'confirmed', reviewerId: 'rv-a', note: 'Smoke plume on imagery.', actions: ['Requested field verification'] },
      '2026-03-01T10:00:00Z',
    );
    expect(log.map((e) => e.type)).toEqual(['assignment', 'action', 'status_change']);
    const state = replay(log);
    expect(state.status).toBe('confirmed');
    expect(state.reviewerId).toBe('rv-a');
    expect(log[2]).toMatchObject({ fromStatus: 'awaiting', toStatus: 'confirmed', note: 'Smoke plume on imagery.' });
  });

  it('appends history on state changes instead of overwriting it', () => {
    let log = save([], 'ALT-1', { status: 'inconclusive', reviewerId: 'rv-a', note: 'Cloud cover, cannot tell.', actions: [] }, '2026-03-01T10:00:00Z');
    const snapshot = structuredClone(log);
    log = save(log, 'ALT-1', { status: 'unconfirmed', reviewerId: 'rv-b', note: 'Clear pass shows no fire.', actions: [] }, '2026-03-01T14:00:00Z');

    expect(log.slice(0, snapshot.length)).toEqual(snapshot);
    const statusEvents = log.filter((e) => e.type === 'status_change');
    expect(statusEvents.map((e) => [e.fromStatus, e.toStatus])).toEqual([
      ['awaiting', 'inconclusive'],
      ['inconclusive', 'unconfirmed'],
    ]);
    expect(replay(log)).toMatchObject({ status: 'unconfirmed', reviewerId: 'rv-b', eventCount: 4 });
  });

  it('replays in timestamp order regardless of storage order', () => {
    const late: VerificationEvent = { id: 'b', alertId: 'X', at: '2026-03-01T12:00:00Z', actor: 't', type: 'status_change', fromStatus: 'confirmed', toStatus: 'unconfirmed' };
    const early: VerificationEvent = { id: 'a', alertId: 'X', at: '2026-03-01T08:00:00Z', actor: 't', type: 'status_change', fromStatus: 'awaiting', toStatus: 'confirmed' };
    expect(replay([late, early]).status).toBe('unconfirmed');
  });

  it('derives state per alert and ignores system events', () => {
    const log: VerificationEvent[] = [
      { id: 's', alertId: null, at: '2026-03-01T00:00:00Z', actor: 'System', type: 'system', note: 'loaded' },
      { id: '1', alertId: 'A', at: '2026-03-01T01:00:00Z', actor: 't', type: 'assignment', reviewerId: 'rv-a' },
      { id: '2', alertId: 'B', at: '2026-03-01T01:00:00Z', actor: 't', type: 'status_change', fromStatus: 'awaiting', toStatus: 'confirmed' },
    ];
    const all = deriveAll(log);
    expect(all.size).toBe(2);
    expect(all.get('A')).toMatchObject({ status: 'awaiting', reviewerId: 'rv-a' });
    expect(all.get('B')?.status).toBe('confirmed');
  });

  describe('validation', () => {
    const base: ReviewDraft = { status: 'awaiting', reviewerId: null, note: '', actions: [] };

    it('rejects an empty save', () => {
      expect(validateReview(INITIAL_STATE, base, REVIEWERS)).toHaveLength(1);
    });

    it('requires a note for a determination', () => {
      const errs = validateReview(INITIAL_STATE, { ...base, status: 'unconfirmed', note: 'no' }, REVIEWERS);
      expect(errs.some((e) => e.includes('note'))).toBe(true);
    });

    it('requires a reviewer to confirm', () => {
      const errs = validateReview(INITIAL_STATE, { ...base, status: 'confirmed', note: 'Plume visible on imagery' }, REVIEWERS);
      expect(errs).toEqual(['Assign a reviewer before confirming an incident.']);
    });

    it('rejects unknown reviewers', () => {
      expect(validateReview(INITIAL_STATE, { ...base, reviewerId: 'ghost' }, REVIEWERS)).toContain('Selected reviewer is not on the roster.');
    });

    it('allows a note-only update without changing status', () => {
      const draft = { ...base, note: 'Range office contacted.' };
      expect(validateReview(INITIAL_STATE, draft, REVIEWERS)).toEqual([]);
      expect(buildReviewEvents('A', INITIAL_STATE, draft, 't', '2026-03-01T00:00:00Z', makeId).map((e) => e.type)).toEqual(['note']);
    });
  });
});
