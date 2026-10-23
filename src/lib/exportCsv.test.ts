import { describe, expect, it } from 'vitest';
import { ASSETS } from '../data/assets';
import { generateObservations, seedEvents } from '../data/observations';
import { buildHash, parseHash } from '../state/hash';
import { deriveAlerts } from '../state/derive';
import { alertsToCsv, csvCell } from './exportCsv';

const ANCHOR = new Date('2026-10-23T06:30:00Z');
const { observations, siteFirstObservation } = generateObservations(ANCHOR);
const alerts = deriveAlerts(observations, seedEvents(ANCHOR, siteFirstObservation), ASSETS, ANCHOR);

describe('CSV export', () => {
  it('writes a header and one row per alert', () => {
    const lines = alertsToCsv(alerts).trimEnd().split('\r\n');
    expect(lines[0].startsWith('alert_id,verification_status,priority_band,priority_score')).toBe(true);
    expect(lines).toHaveLength(alerts.length + 1);
    expect(lines[1]).toContain(alerts[0].id);
    expect(lines[1].endsWith('Demo sample')).toBe(true);
  });

  it('quotes delimiters and neutralises spreadsheet formulas', () => {
    expect(csvCell('Pauri, reserved "block"')).toBe('"Pauri, reserved ""block"""');
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('-12.5')).toBe('-12.5');
    expect(csvCell(42)).toBe('42');
  });
});

describe('alert links', () => {
  it('round-trips view and alert id through the hash', () => {
    expect(parseHash(buildHash('map', 'ALT-OD-001'))).toEqual({ view: 'map', alertId: 'ALT-OD-001' });
    expect(parseHash('#/alerts')).toEqual({ view: 'alerts', alertId: null });
  });

  it('ignores unknown views and malformed alert ids', () => {
    expect(parseHash('#/nope/ALT-1')).toEqual({ view: 'overview', alertId: 'ALT-1' });
    expect(parseHash('#/map/<script>')).toEqual({ view: 'map', alertId: null });
    expect(parseHash('')).toEqual({ view: 'overview', alertId: null });
  });
});
