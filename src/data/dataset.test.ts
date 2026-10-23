import { describe, expect, it } from 'vitest';
import { parsePersisted, loadState, saveState, SCHEMA_VERSION, STORAGE_KEY, type PersistedState } from '../persistence/storage';
import { deriveAlerts } from '../state/derive';
import { ASSETS } from './assets';
import { generateObservations, seedEvents } from './observations';

const ANCHOR = new Date('2026-10-23T06:30:00Z');

describe('demo dataset', () => {
  const { observations, siteFirstObservation } = generateObservations(ANCHOR);
  const events = seedEvents(ANCHOR, siteFirstObservation);
  const alerts = deriveAlerts(observations, events, ASSETS, ANCHOR);

  it('has 40–60 uniquely identified, labelled sample observations', () => {
    expect(observations.length).toBeGreaterThanOrEqual(40);
    expect(observations.length).toBeLessThanOrEqual(60);
    expect(new Set(observations.map((o) => o.id)).size).toBe(observations.length);
    expect(observations.every((o) => o.provenance === 'demo-sample')).toBe(true);
  });

  it('is deterministic for a given anchor', () => {
    expect(generateObservations(ANCHOR).observations).toEqual(observations);
  });

  it('never places observations after the anchor time', () => {
    expect(observations.every((o) => Date.parse(o.observedAt) <= ANCHOR.getTime())).toBe(true);
  });

  it('groups nearby and repeated observations into candidate alerts without losing any', () => {
    const referenced = alerts.flatMap((a) => a.observationIds);
    expect(referenced.sort()).toEqual(observations.map((o) => o.id).sort());
    expect(alerts.some((a) => a.observations.length >= 5 && a.distinctPasses >= 4)).toBe(true);
    expect(alerts.length).toBeLessThan(observations.length);
  });

  it('attaches every seeded event to an existing alert', () => {
    const ids = new Set(alerts.map((a) => a.id));
    expect(events.filter((e) => e.alertId).every((e) => ids.has(e.alertId!))).toBe(true);
  });

  it('opens with alerts in all four workflow states and at least one incomplete score', () => {
    const statuses = new Set(alerts.map((a) => a.verification.status));
    expect([...statuses].sort()).toEqual(['awaiting', 'confirmed', 'inconclusive', 'unconfirmed']);
    expect(alerts.some((a) => a.score.incomplete)).toBe(true);
    expect(alerts.some((a) => a.nearHeatSource)).toBe(true);
  });
});

describe('persistence', () => {
  function memoryStorage() {
    const m = new Map<string, string>();
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
      raw: m,
    };
  }

  it('round-trips saved state', () => {
    const s = memoryStorage();
    const state: PersistedState = {
      schemaVersion: SCHEMA_VERSION,
      anchor: ANCHOR.toISOString(),
      events: seedEvents(ANCHOR, generateObservations(ANCHOR).siteFirstObservation),
      actingAs: 'Demo operator',
      lastRefreshedAt: ANCHOR.toISOString(),
    };
    expect(saveState(state, s)).toBeNull();
    expect(loadState(s)).toEqual({ state, error: null });
  });

  it('falls back safely on corrupt data and keeps a backup', () => {
    const s = memoryStorage();
    s.setItem(STORAGE_KEY, '{"schemaVersion":1,"events":"nope"}');
    const result = loadState(s);
    expect(result.state).toBeNull();
    expect(result.error).toMatch(/unreadable/);
    expect([...s.raw.keys()].some((k) => k.includes('corrupt'))).toBe(true);
    expect(parsePersisted('not json')).toBeNull();
  });

  it('reports unavailable storage instead of throwing', () => {
    expect(loadState(null).error).toMatch(/unavailable/);
  });
});
