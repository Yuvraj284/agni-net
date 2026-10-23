import { useEffect, useState } from 'react';
import { CloudOff, Compass, Droplets, Navigation, Thermometer, Wind } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  bearingToCompass,
  computeFireSpread,
  fetchFireWeather,
  type FireWeather,
  type SpreadProjection,
} from '../../lib/weather';
import type { EnrichedAlert } from '../../types';

const DANGER_CLASS: Record<FireWeather['fireDangerIndex'], string> = {
  Extreme: 'bg-critical/10 text-critical',
  'Very High': 'bg-critical/10 text-critical',
  High: 'bg-high/10 text-high',
  Moderate: 'bg-medium/10 text-medium',
  Low: 'bg-surface-3 text-fg-muted',
};

function Metric({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs text-fg-subtle">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </div>
      <div className="mt-1 text-13 font-medium tabular-nums text-fg">{children}</div>
    </div>
  );
}

export function FireWeatherCard({ alert }: { alert: EnrichedAlert }) {
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

  if (!result || result.id !== alert.id) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-3 text-xs text-fg-subtle">
        <Wind className="h-4 w-4 animate-pulse" aria-hidden />
        Loading current weather for this location…
      </div>
    );
  }

  const { weather, spread } = result;
  const live = weather.source === 'live-meteo';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {live ? (
          <span className="text-fg-muted">
            Current conditions from <span className="font-medium text-fg">Open-Meteo</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-fg-muted">
            <CloudOff className="h-3.5 w-3.5" aria-hidden />
            Live weather unavailable — showing a sample estimate
          </span>
        )}
        <span className={`rounded-md px-2 py-0.5 font-medium ${DANGER_CLASS[weather.fireDangerIndex]}`}>
          Indicative fire danger: {weather.fireDangerIndex.toLowerCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric icon={Thermometer} label="Temperature">{weather.temperatureC}°C</Metric>
        <Metric icon={Droplets} label="Humidity">{weather.relativeHumidity}%</Metric>
        <Metric icon={Compass} label="Wind">
          {weather.windSpeedKmh} <span className="text-xs font-normal text-fg-subtle">km/h</span>
        </Metric>
        <Metric icon={Navigation} label="From">
          {bearingToCompass(weather.windDirectionDeg)}{' '}
          <span className="font-mono text-xs font-normal text-fg-subtle">{weather.windDirectionDeg}°</span>
        </Metric>
      </div>

      <div className="rounded-lg border border-line bg-surface px-3 py-2.5 text-xs leading-relaxed">
        <div className="flex items-center justify-between gap-3 text-fg-muted">
          <span>Downwind direction</span>
          <span className="font-medium text-fg">
            Towards {bearingToCompass(weather.downwindBearingDeg)} ({Math.round(weather.downwindBearingDeg)}°)
          </span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 border-t border-line pt-2">
          <div>
            <div className="text-fg-subtle">Reach in 3 h</div>
            <div className="font-medium tabular-nums text-fg">~{spread.forwardDistance3hKm} km</div>
          </div>
          <div>
            <div className="text-fg-subtle">Reach in 6 h</div>
            <div className="font-medium tabular-nums text-fg">~{spread.forwardDistance6hKm} km</div>
          </div>
          <div>
            <div className="text-fg-subtle">Assumed rate</div>
            <div className="font-medium tabular-nums text-fg">{spread.rateOfSpreadKmh} km/h</div>
          </div>
        </div>
        <p className="mt-2 text-fg-subtle">
          Simple wind-and-humidity heuristic for discussing direction and urgency. It ignores fuel, slope and terrain and
          is not validated — not a fire-behaviour forecast. The detections themselves are sample data.
        </p>
      </div>
    </div>
  );
}
