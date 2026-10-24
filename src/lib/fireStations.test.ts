import { describe, expect, it } from 'vitest';
import { ASSETS } from '../data/assets';
import { FIRE_STATIONS } from '../data/fireStations';
import { generateObservations, seedEvents } from '../data/observations';
import { deriveAlerts } from '../state/derive';
import { findNearestFireStation } from './fireStations';
import { buildFireStationDispatchMessage } from './dispatch';
import type { FireStation } from '../types';

const ANCHOR = new Date('2026-10-23T06:30:00Z');
const { observations, siteFirstObservation } = generateObservations(ANCHOR);
const alerts = deriveAlerts(observations, seedEvents(ANCHOR, siteFirstObservation), ASSETS, ANCHOR);
const sampleAlert = alerts[0];

describe('findNearestFireStation', () => {
  it('finds Ramnagar fire station for Corbett area coordinates', () => {
    // Alert in Corbett (approx 29.54, 78.91)
    const result = findNearestFireStation([29.54, 78.91], 'uk');
    expect(result).not.toBeNull();
    expect(result!.station.id).toBe('fs-uk-ramnagar');
    expect(result!.distanceKm).toBeGreaterThan(0);
    expect(result!.distanceKm).toBeLessThan(40);
    expect(result!.estimatedMinutes).toBeGreaterThan(5);
  });

  it('finds Baripada fire station for Similipal coordinates', () => {
    // Similipal center (approx 21.85, 86.32)
    const result = findNearestFireStation([21.85, 86.32], 'od');
    expect(result).not.toBeNull();
    expect(result!.station.id).toBe('fs-od-baripada');
  });

  it('falls back gracefully when region has no specific stations', () => {
    const result = findNearestFireStation([22.5, 80.5]);
    expect(result).not.toBeNull();
    expect(FIRE_STATIONS.some((s) => s.id === result!.station.id)).toBe(true);
  });
});

describe('buildFireStationDispatchMessage', () => {
  const mockStation: FireStation = {
    id: 'fs-uk-ramnagar',
    name: 'Ramnagar Fire Station',
    regionId: 'uk',
    location: [29.398, 79.124],
    address: 'Station Road, Ramnagar',
    phone: '+91 5947 251101',
    whatsappPhone: '915947251101',
    officerInCharge: 'Station Fire Officer (SFO) B.S. Rawat',
    appliances: '2 Water Tenders',
  };

  it('generates tactical emergency wildfire message containing station name and coordinates', () => {
    const msg = buildFireStationDispatchMessage(sampleAlert, mockStation, 14.2, 22, null);
    expect(msg).toContain('URGENT WILDFIRE DISPATCH');
    expect(msg).toContain('Ramnagar Fire Station');
    expect(msg).toContain('Station Fire Officer (SFO) B.S. Rawat');
    expect(msg).toContain(sampleAlert.id);
    expect(msg).toContain(sampleAlert.band.toUpperCase());
    expect(msg).toContain('DRIVING ROUTE FROM STATION');
    expect(msg).toContain('google.com/maps/dir');
    expect(msg).toContain('14.2 km');
    expect(msg).toContain('~22 mins transit');
  });
});
