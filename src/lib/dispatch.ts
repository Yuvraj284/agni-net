import type { EnrichedAlert } from '../types';
import { formatCoord, formatDateTime, formatKm } from './format';
import { STATUS_META } from './verification';
import { bearingToCompass, type FireWeather } from './weather';

/**
 * Plain-text WhatsApp dispatch message for an alert. Always marked as demo data, says
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
    '*AgniNet — DEMO DATA, not a real alert*',
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
