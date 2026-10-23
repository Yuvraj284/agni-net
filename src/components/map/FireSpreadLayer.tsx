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

function createWindMarker(weather: FireWeather) {
  const dir = weather.windDirectionDeg;
  const compass = bearingToCompass(dir);
  const arrowAngle = (dir + 180) % 360; // Arrow points downwind

  const html = `
    <div class="flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-2 py-1 text-xs font-medium text-fg shadow-card backdrop-blur-sm pointer-events-auto">
      <svg class="h-3.5 w-3.5 text-accent shrink-0 transition-transform" style="transform: rotate(${arrowAngle}deg)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="19" x2="12" y2="5"></line>
        <polyline points="5 12 12 5 19 12"></polyline>
      </svg>
      <span class="tabular-nums font-mono text-[11px]">${weather.windSpeedKmh} <span class="text-fg-subtle">km/h</span> ${compass}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'agn-wind-badge',
    iconSize: [95, 26],
    iconAnchor: [47, 13],
  });
}

export function FireSpreadLayer({ alert }: { alert: EnrichedAlert }) {
  const [weather, setWeather] = useState<FireWeather | null>(null);
  const [spread, setSpread] = useState<SpreadProjection | null>(null);

  useEffect(() => {
    let active = true;
    fetchFireWeather(alert.centroid[0], alert.centroid[1], alert.regionId).then((w) => {
      if (!active) return;
      setWeather(w);
      setSpread(computeFireSpread(alert.centroid, w, alert.extentKm));
    });
    return () => {
      active = false;
    };
  }, [alert.id, alert.centroid, alert.regionId, alert.extentKm]);

  if (!weather || !spread) return null;

  // Place the wind indicator slightly offset upwind from the centroid so it doesn't overlap the fire marker
  const windBadgePos = destinationPoint(alert.centroid, Math.max(1.2, alert.extentKm + 0.8), weather.windDirectionDeg);

  return (
    <>
      {/* 6-Hour Projected Spread Contour */}
      <Polygon
        positions={spread.hours6}
        pathOptions={{
          color: '#ef4444',
          weight: 1.5,
          dashArray: '5 5',
          fillColor: '#ef4444',
          fillOpacity: 0.08,
        }}
      >
        <Tooltip sticky direction="top">
          <div className="text-xs">
            <span className="font-semibold text-critical">6h Projected Spread</span>
            <div className="text-fg-subtle">
              Est. forward reach: ~{spread.forwardDistance6hKm} km
              <br />
              Bearing: {Math.round(weather.downwindBearingDeg)}° ({bearingToCompass(weather.downwindBearingDeg)})
            </div>
          </div>
        </Tooltip>
      </Polygon>

      {/* 3-Hour Projected Spread Contour */}
      <Polygon
        positions={spread.hours3}
        pathOptions={{
          color: '#f97316',
          weight: 2,
          dashArray: '4 4',
          fillColor: '#f97316',
          fillOpacity: 0.14,
        }}
      >
        <Tooltip sticky direction="top">
          <div className="text-xs">
            <span className="font-semibold text-medium">3h Projected Spread</span>
            <div className="text-fg-subtle">
              Est. forward reach: ~{spread.forwardDistance3hKm} km
              <br />
              Rate of spread: {spread.rateOfSpreadKmh} km/h
            </div>
          </div>
        </Tooltip>
      </Polygon>

      {/* Wind Vector Chip */}
      <Marker position={windBadgePos} icon={createWindMarker(weather)}>
        <Tooltip direction="bottom" offset={[0, 10]}>
          <div className="text-xs">
            <span className="font-semibold">Local Fire Weather</span>
            <div className="text-fg-subtle">
              Temp: {weather.temperatureC}°C · RH: {weather.relativeHumidity}%
              <br />
              Wind: {weather.windSpeedKmh} km/h (gusts {weather.windGustsKmh} km/h)
              <br />
              Fire Danger: <span className="font-medium text-fg">{weather.fireDangerIndex}</span>
            </div>
          </div>
        </Tooltip>
      </Marker>
    </>
  );
}
