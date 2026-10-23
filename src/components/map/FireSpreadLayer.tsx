import { useEffect, useState } from 'react';
import { Marker, Polygon, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import {
  bearingToCompass,
  computeFireSpread,
  destinationPoint,
  fetchFireWeather,
  type FireWeather,
  type SpreadProjection,
} from '../../lib/weather';
import type { EnrichedAlert } from '../../types';

function windIcon(weather: FireWeather) {
  const html =
    `<div class="agn-wind-chip">` +
    `<svg style="transform: rotate(${weather.downwindBearingDeg}deg)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
    `<line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>` +
    `<span>${weather.windSpeedKmh} km/h</span></div>`;
  return L.divIcon({ html, className: 'agn-wind-badge', iconSize: [78, 24], iconAnchor: [39, 12] });
}

/** Wind arrow and illustrative 3 h / 6 h spread envelope around the selected alert. */
export function FireSpreadLayer({ alert }: { alert: EnrichedAlert }) {
  const [result, setResult] = useState<{ id: string; weather: FireWeather; spread: SpreadProjection } | null>(null);

  useEffect(() => {
    let active = true;
    fetchFireWeather(alert.centroid[0], alert.centroid[1], alert.regionId).then((weather) => {
      if (active) setResult({ id: alert.id, weather, spread: computeFireSpread(alert.centroid, weather, alert.extentKm) });
    });
    return () => {
      active = false;
    };
  }, [alert.id, alert.centroid, alert.regionId, alert.extentKm]);

  if (!result || result.id !== alert.id) return null;
  const { weather, spread } = result;
  const source = weather.source === 'live-meteo' ? 'Current wind (Open-Meteo)' : 'Sample wind estimate';

  // Place the wind chip upwind of the centroid so it does not cover the fire markers.
  const chipPos = destinationPoint(alert.centroid, Math.max(1.2, alert.extentKm + 0.8), weather.windDirectionDeg);

  return (
    <>
      <Polygon
        positions={spread.hours6}
        pathOptions={{ className: 'agn-spread-6h', weight: 1.5, dashArray: '5 5', fillOpacity: 0.06 }}
      >
        <Tooltip sticky direction="top">
          <span className="agn-tip-title">Illustrative 6 h envelope</span>
          <br />
          <span className="agn-tip-muted">~{spread.forwardDistance6hKm} km downwind · not a forecast</span>
        </Tooltip>
      </Polygon>
      <Polygon
        positions={spread.hours3}
        pathOptions={{ className: 'agn-spread-3h', weight: 1.5, dashArray: '4 4', fillOpacity: 0.12 }}
      >
        <Tooltip sticky direction="top">
          <span className="agn-tip-title">Illustrative 3 h envelope</span>
          <br />
          <span className="agn-tip-muted">~{spread.forwardDistance3hKm} km downwind · not a forecast</span>
        </Tooltip>
      </Polygon>
      <Marker position={chipPos} icon={windIcon(weather)} keyboard={false}>
        <Tooltip direction="bottom" offset={[0, 10]}>
          <span className="agn-tip-title">{source}</span>
          <br />
          <span className="agn-tip-muted">
            From {bearingToCompass(weather.windDirectionDeg)} at {weather.windSpeedKmh} km/h (gusts {weather.windGustsKmh})
            <br />
            {weather.temperatureC}°C · humidity {weather.relativeHumidity}%
          </span>
        </Tooltip>
      </Marker>
    </>
  );
}
