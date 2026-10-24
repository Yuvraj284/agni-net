import type { EnrichedAlert, FireStation } from '../types';
import { formatCoord, formatDateTime, formatKm } from './format';
import { isLiveAlert } from './provenance';
import { STATUS_META } from './verification';
import { bearingToCompass, type FireWeather } from './weather';

/**
 * Plain-text WhatsApp dispatch message for an alert. Marked as demo data or as an unverified
 * NASA FIRMS detection, says
 * whether the alert is a candidate or a verified incident, and only quotes weather when it
 * came from the live source.
 */
export function buildDispatchMessage(alert: EnrichedAlert, weather: FireWeather | null): string {
  const [lat, lon] = alert.centroid;
  const status = STATUS_META[alert.verification.status].label.toLowerCase();
  const kind = alert.verification.status === 'confirmed' ? 'Verified fire incident' : `Candidate fire alert (${status})`;
  const score = `${alert.score.incomplete ? '≥ ' : ''}${alert.score.score.toFixed(1)}/100`;
  const asset = alert.nearestAsset
    ? alert.nearestAsset.distanceKm === 0
      ? `inside ${alert.nearestAsset.asset.name}`
      : `${alert.nearestAsset.asset.name}, ${formatKm(alert.nearestAsset.distanceKm)} away`
    : 'none within 10 km';
  const weatherLine = !weather
    ? 'not available'
    : weather.source === 'live-meteo'
      ? `${weather.temperatureC}°C, humidity ${weather.relativeHumidity}%, wind ${weather.windSpeedKmh} km/h towards ${bearingToCompass(weather.downwindBearingDeg)} (Open-Meteo, current)`
      : 'live weather unavailable';

  return [
    isLiveAlert(alert)
      ? '*AgniNet — NASA FIRMS satellite detection, not yet verified on the ground*'
      : '*AgniNet — DEMO DATA, not a real alert*',
    '',
    `*${kind}* ${alert.id}`,
    `Priority: ${alert.band} · score ${score}`,
    `Region: ${alert.regionName}`,
    `Location: ${formatCoord(lat, lon)}`,
    `Map: https://www.google.com/maps?q=${lat.toFixed(4)},${lon.toFixed(4)}`,
    `Nearest mapped asset: ${asset}`,
    `Detections: ${alert.observations.length} across ${alert.distinctPasses} satellite pass${alert.distinctPasses === 1 ? '' : 'es'}, last ${formatDateTime(alert.lastObservedAt)}`,
    `Weather at location: ${weatherLine}`,
    '',
    'Request: ground verification. Please reply with what you find.',
    '_Sent from AgniNet (prototype)_',
  ].join('\n');
}

/**
 * Plain-text WhatsApp emergency dispatch message specifically tailored for local Fire Services
 * and emergency rescue units. Includes tactical driving route from station, distance,
 * asset threat, and weather spread.
 */
export function buildFireStationDispatchMessage(
  alert: EnrichedAlert,
  station: FireStation,
  distanceKm: number,
  estimatedMinutes: number,
  weather: FireWeather | null,
): string {
  const [lat, lon] = alert.centroid;
  const status = STATUS_META[alert.verification.status].label.toLowerCase();
  const kind = alert.verification.status === 'confirmed' ? 'VERIFIED FIRE INCIDENT' : `CANDIDATE FIRE ALERT (${status.toUpperCase()})`;
  const score = `${alert.score.incomplete ? '≥ ' : ''}${alert.score.score.toFixed(1)}/100`;
  const asset = alert.nearestAsset
    ? alert.nearestAsset.distanceKm === 0
      ? `Inside ${alert.nearestAsset.asset.name}`
      : `${alert.nearestAsset.asset.name} (${formatKm(alert.nearestAsset.distanceKm)} from fire)`
    : 'None within 10 km';

  const weatherLine = !weather
    ? 'Weather data currently unavailable'
    : weather.source === 'live-meteo'
      ? `${weather.temperatureC}°C, humidity ${weather.relativeHumidity}%, wind ${weather.windSpeedKmh} km/h blowing ${bearingToCompass(weather.downwindBearingDeg)} (Spread direction: ${bearingToCompass(weather.downwindBearingDeg)})`
      : 'Live microclimate unavailable';

  const routeUrl = `https://www.google.com/maps/dir/?api=1&origin=${station.location[0].toFixed(4)},${station.location[1].toFixed(4)}&destination=${lat.toFixed(4)},${lon.toFixed(4)}`;

  return [
    '🚨 *URGENT WILDFIRE DISPATCH — AGNI-NET EARLY WARNING* 🚨',
    isLiveAlert(alert)
      ? '*NASA FIRMS near-real-time thermal detection — Immediate turnout/ground assessment requested*'
      : '*DEMO SIMULATION — Emergency drill data*',
    '',
    `*TO:* ${station.name}`,
    `*ATTN:* ${station.officerInCharge}`,
    '',
    `*STATUS:* ${kind} · [${alert.id}]`,
    `*PRIORITY:* ${alert.band.toUpperCase()} (Triage score: ${score})`,
    `*REGION:* ${alert.regionName}`,
    '',
    `📍 *FIRE COORDINATES:* ${formatCoord(lat, lon)}`,
    `🚗 *DRIVING ROUTE FROM STATION:* ${routeUrl}`,
    `📏 *DISTANCE FROM STATION:* ${formatKm(distanceKm)} (~${estimatedMinutes} mins transit)`,
    `🌲 *THREATENED ASSET:* ${asset}`,
    `🛰️ *THERMAL DETECTIONS:* ${alert.observations.length} hotspot(s) across ${alert.distinctPasses} satellite pass(es), latest: ${formatDateTime(alert.lastObservedAt)}`,
    `💨 *WIND & WEATHER:* ${weatherLine}`,
    '',
    '⚠️ *TACTICAL ACTION REQUIRED:*',
    '1. Please mobilize Quick Response Tender / Water Bowser if accessible.',
    '2. Coordinate with local Forest Range Office.',
    '3. Reply to this thread with station turnout confirmation.',
    '',
    '_Automated dispatch via AgniNet Early Warning Platform (prototype)_',
  ].join('\n');
}
