import { describe, expect, it } from 'vitest';
import { ASSETS } from '../data/assets';
import { generateObservations, seedEvents } from '../data/observations';
import { deriveAlerts } from '../state/derive';
import { buildDispatchMessage } from './dispatch';
import { estimateRegionalWeather, type FireWeather } from './weather';

const ANCHOR = new Date('2026-10-23T06:30:00Z');
const { observations, siteFirstObservation } = generateObservations(ANCHOR);
const alerts = deriveAlerts(observations, seedEvents(ANCHOR, siteFirstObservation), ASSETS, ANCHOR);
const candidate = alerts.find((a) => a.verification.status === 'awaiting')!;
const confirmed = alerts.find((a) => a.verification.status === 'confirmed')!;
const live: FireWeather = { ...estimateRegionalWeather(30, 79), source: 'live-meteo' };

describe('WhatsApp dispatch message', () => {
  it('is always marked as demo data', () => {
    for (const a of [candidate, confirmed]) expect(buildDispatchMessage(a, live)).toMatch(/DEMO DATA, not a real alert/);
  });

  it('distinguishes candidate alerts from verified incidents', () => {
    expect(buildDispatchMessage(candidate, live)).toContain(`*Candidate fire alert (awaiting verification)* ${candidate.id}`);
    expect(buildDispatchMessage(confirmed, live)).toContain(`*Verified fire incident* ${confirmed.id}`);
  });

  it('only quotes weather values when they came from the live source', () => {
    const sample = estimateRegionalWeather(30, 79);
    expect(buildDispatchMessage(candidate, live)).toContain(`${live.temperatureC}°C`);
    expect(buildDispatchMessage(candidate, sample)).toContain('live weather unavailable');
    expect(buildDispatchMessage(candidate, sample)).not.toContain(`${sample.temperatureC}°C`);
  });

  it('asks for verification instead of issuing operational directives', () => {
    const msg = buildDispatchMessage(candidate, null);
    expect(msg).toContain('Request: ground verification');
    expect(msg).not.toMatch(/counter-fire|tactical/i);
  });
});
