import { describe, expect, it } from 'vitest';
import {
  bearingToCompass,
  computeFireSpread,
  destinationPoint,
  estimateRegionalWeather,
} from './weather';

describe('weather & fire spread', () => {
  it('destinationPoint shifts coordinates in the right direction', () => {
    const origin: [number, number] = [30.0, 78.0];
    // East: latitude stays same, longitude increases
    const east = destinationPoint(origin, 10, 90);
    expect(east[0]).toBeCloseTo(30.0, 1);
    expect(east[1]).toBeGreaterThan(78.0);

    // North: latitude increases, longitude stays same
    const north = destinationPoint(origin, 10, 0);
    expect(north[0]).toBeGreaterThan(30.0);
    expect(north[1]).toBeCloseTo(78.0, 1);
  });

  it('bearingToCompass converts azimuths correctly', () => {
    expect(bearingToCompass(0)).toBe('N');
    expect(bearingToCompass(90)).toBe('E');
    expect(bearingToCompass(180)).toBe('S');
    expect(bearingToCompass(270)).toBe('W');
    expect(bearingToCompass(225)).toBe('SW');
  });

  it('estimateRegionalWeather produces valid meteorological parameters', () => {
    const w = estimateRegionalWeather(30.15, 78.79, 'uk');
    expect(w.temperatureC).toBeGreaterThanOrEqual(25);
    expect(w.relativeHumidity).toBeGreaterThanOrEqual(15);
    expect(w.windSpeedKmh).toBeGreaterThan(0);
    expect(w.downwindBearingDeg).toBeGreaterThanOrEqual(0);
    expect(w.downwindBearingDeg).toBeLessThan(360);
  });

  it('computeFireSpread generates 3h and 6h spread polygons', () => {
    const origin: [number, number] = [30.15, 78.79];
    const weather = estimateRegionalWeather(30.15, 78.79, 'uk');
    const spread = computeFireSpread(origin, weather, 0.5);

    expect(spread.hours3.length).toBe(24);
    expect(spread.hours6.length).toBe(24);
    expect(spread.forwardDistance6hKm).toBeGreaterThan(spread.forwardDistance3hKm);
    expect(spread.rateOfSpreadKmh).toBeGreaterThan(0);
  });
});
