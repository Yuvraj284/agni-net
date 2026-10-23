import { useEffect, useState } from 'react';
import { Compass, Flame, Gauge, Navigation, Thermometer, Wind } from 'lucide-react';
import {
  bearingToCompass,
  computeFireSpread,
  fetchFireWeather,
  type FireWeather,
  type SpreadProjection,
} from '../../lib/weather';
import type { EnrichedAlert } from '../../types';

export function FireWeatherCard({ alert }: { alert: EnrichedAlert }) {
  const [weather, setWeather] = useState<FireWeather | null>(null);
  const [spread, setSpread] = useState<SpreadProjection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchFireWeather(alert.centroid[0], alert.centroid[1], alert.regionId).then((w) => {
      if (!active) return;
      setWeather(w);
      setSpread(computeFireSpread(alert.centroid, w, alert.extentKm));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [alert.id, alert.centroid, alert.regionId, alert.extentKm]);

  if (loading || !weather || !spread) {
    return (
      <div className="flex animate-pulse items-center gap-2 rounded-lg border border-line bg-surface-2 p-3 text-xs text-fg-subtle">
        <Wind className="h-4 w-4 animate-spin text-accent" />
        Syncing local meteorological data and spread projection...
      </div>
    );
  }

  const dangerCls =
    weather.fireDangerIndex === 'Extreme'
      ? 'text-critical bg-critical/10 border-critical/30'
      : weather.fireDangerIndex === 'Very High'
        ? 'text-critical bg-critical/10 border-critical/20'
        : weather.fireDangerIndex === 'High'
          ? 'text-medium bg-medium/10 border-medium/20'
          : 'text-success bg-success/10 border-success/20';

  const compass = bearingToCompass(weather.windDirectionDeg);
  const downwindCompass = bearingToCompass(weather.downwindBearingDeg);

  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface-2/60 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-fg">
          <Wind className="h-4 w-4 text-accent" />
          <span>Fire Weather & Propagation</span>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-2xs font-medium ${dangerCls}`}>
          <Flame className="h-3 w-3" />
          {weather.fireDangerIndex} Fire Danger
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div className="rounded-lg border border-line bg-surface p-2.5">
          <div className="flex items-center gap-1.5 text-fg-subtle">
            <Thermometer className="h-3.5 w-3.5 text-critical" />
            <span>Temp</span>
          </div>
          <div className="mt-1 font-mono text-13 font-medium text-fg">{weather.temperatureC}°C</div>
        </div>

        <div className="rounded-lg border border-line bg-surface p-2.5">
          <div className="flex items-center gap-1.5 text-fg-subtle">
            <Gauge className="h-3.5 w-3.5 text-info" />
            <span>Rel Humidity</span>
          </div>
          <div className="mt-1 font-mono text-13 font-medium text-fg">{weather.relativeHumidity}%</div>
        </div>

        <div className="rounded-lg border border-line bg-surface p-2.5">
          <div className="flex items-center gap-1.5 text-fg-subtle">
            <Compass className="h-3.5 w-3.5 text-accent" />
            <span>Wind Speed</span>
          </div>
          <div className="mt-1 font-mono text-13 font-medium text-fg">
            {weather.windSpeedKmh} <span className="text-2xs font-normal text-fg-subtle">km/h</span>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-surface p-2.5">
          <div className="flex items-center gap-1.5 text-fg-subtle">
            <Navigation
              className="h-3.5 w-3.5 text-amber-500"
              style={{ transform: `rotate(${weather.downwindBearingDeg}deg)` }}
            />
            <span>Direction</span>
          </div>
          <div className="mt-1 font-mono text-13 font-medium text-fg">
            {compass} <span className="text-2xs text-fg-subtle">({weather.windDirectionDeg}°)</span>
          </div>
        </div>
      </div>

      {/* Downwind Spread Prediction Summary */}
      <div className="rounded-lg border border-line bg-surface p-3 text-xs leading-relaxed">
        <div className="flex items-center justify-between text-fg-muted">
          <span>Downwind Spread Axis:</span>
          <span className="font-medium text-fg">
            Towards {downwindCompass} ({Math.round(weather.downwindBearingDeg)}°)
          </span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line/60 pt-2 text-2xs">
          <div>
            <span className="text-fg-subtle">3h Forward Reach:</span>
            <div className="font-mono text-xs font-semibold text-medium">~{spread.forwardDistance3hKm} km</div>
          </div>
          <div>
            <span className="text-fg-subtle">6h Forward Reach:</span>
            <div className="font-mono text-xs font-semibold text-critical">~{spread.forwardDistance6hKm} km</div>
          </div>
        </div>
        <div className="mt-2 text-2xs text-fg-subtle">
          Estimated spread velocity: <span className="font-mono font-medium text-fg">{spread.rateOfSpreadKmh} km/h</span>{' '}
          (Rothermel surface model with live wind/humidity modulation).
        </div>
      </div>
    </div>
  );
}
