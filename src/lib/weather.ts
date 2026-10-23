import type { RegionId } from '../types';

const EARTH_RADIUS_KM = 6371.0088;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export interface FireWeather {
  temperatureC: number;
  relativeHumidity: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  windGustsKmh: number;
  downwindBearingDeg: number;
  source: 'live-meteo' | 'sample-estimate';
  fireDangerIndex: 'Low' | 'Moderate' | 'High' | 'Very High' | 'Extreme';
}

export interface SpreadProjection {
  hours3: [number, number][];
  hours6: [number, number][];
  forwardDistance3hKm: number;
  forwardDistance6hKm: number;
  rateOfSpreadKmh: number;
}

/** Compute destination point on a sphere given origin [lat, lon], distance in km, and bearing in degrees. */
export function destinationPoint(
  origin: [number, number],
  distanceKm: number,
  bearingDeg: number,
): [number, number] {
  const [lat1, lon1] = origin;
  const dByR = distanceKm / EARTH_RADIUS_KM;
  const brng = toRad(bearingDeg);
  const phi1 = toRad(lat1);
  const lambda1 = toRad(lon1);

  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(dByR) + Math.cos(phi1) * Math.sin(dByR) * Math.cos(brng),
  );
  const lambda2 =
    lambda1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(dByR) * Math.cos(phi1),
      Math.cos(dByR) - Math.sin(phi1) * Math.sin(phi2),
    );

  return [toDeg(phi2), toDeg(lambda2)];
}

/** Compass label for wind bearing */
export function bearingToCompass(deg: number): string {
  const val = Math.floor((deg / 22.5) + 0.5);
  const arr = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return arr[val % 16];
}

/** Deterministic fallback weather for when offline or network fails */
export function estimateRegionalWeather(lat: number, lon: number, regionId?: RegionId): FireWeather {
  // Deterministic seasonal fire weather for India's fire season (dry, warm, moderate winds)
  const seed = Math.abs(Math.sin(lat * 12.9898 + lon * 78.233) * 43758.5453) % 1;
  const temp = 28 + Math.floor(seed * 10); // 28 - 38 °C
  const rh = 22 + Math.floor((1 - seed) * 25); // 22 - 47 %
  const speed = 12 + Math.floor(seed * 16); // 12 - 28 km/h
  // Typical pre-monsoon wind directions in India: westerly / south-westerly
  const baseDir = regionId === 'uk' ? 240 : regionId === 'mz' ? 200 : regionId === 'pb' ? 290 : 260;
  const dir = (baseDir + Math.floor((seed - 0.5) * 40) + 360) % 360;
  const downwind = (dir + 180) % 360;

  return {
    temperatureC: temp,
    relativeHumidity: rh,
    windSpeedKmh: speed,
    windDirectionDeg: dir,
    windGustsKmh: speed + 8,
    downwindBearingDeg: downwind,
    source: 'sample-estimate',
    fireDangerIndex: temp > 34 && rh < 30 ? 'Extreme' : temp > 30 || rh < 35 ? 'Very High' : 'High',
  };
}

/** In-memory cache for weather results */
const weatherCache = new Map<string, { weather: FireWeather; expiresAt: number }>();

/** Fetch live meteorological data for an alert coordinate (Open-Meteo, free, no API key required) */
export async function fetchFireWeather(lat: number, lon: number, regionId?: RegionId): Promise<FireWeather> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = weatherCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.weather;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Weather API returned ${res.status}`);
    const data = await res.json();
    const cur = data.current;

    const temp = Math.round(cur.temperature_2m ?? 30);
    const rh = Math.round(cur.relative_humidity_2m ?? 35);
    const speed = Math.round(cur.wind_speed_10m ?? 15);
    const dir = Math.round(cur.wind_direction_10m ?? 240);
    const gusts = Math.round(cur.wind_gusts_10m ?? (speed + 6));
    const downwind = (dir + 180) % 360;

    let danger: FireWeather['fireDangerIndex'] = 'Moderate';
    if (temp >= 36 && rh <= 25 && speed >= 20) danger = 'Extreme';
    else if (temp >= 32 && rh <= 35) danger = 'Very High';
    else if (temp >= 28 || rh <= 45) danger = 'High';

    const result: FireWeather = {
      temperatureC: temp,
      relativeHumidity: rh,
      windSpeedKmh: speed,
      windDirectionDeg: dir,
      windGustsKmh: gusts,
      downwindBearingDeg: downwind,
      source: 'live-meteo',
      fireDangerIndex: danger,
    };

    weatherCache.set(key, { weather: result, expiresAt: Date.now() + 10 * 60 * 1000 });
    return result;
  } catch {
    const fallback = estimateRegionalWeather(lat, lon, regionId);
    weatherCache.set(key, { weather: fallback, expiresAt: Date.now() + 2 * 60 * 1000 });
    return fallback;
  }
}

/**
 * Rothermel-inspired surface fire propagation model.
 * Produces 3h and 6h projected downwind spread polygons.
 */
export function computeFireSpread(
  origin: [number, number],
  weather: FireWeather,
  extentKm: number = 0.5,
): SpreadProjection {
  // Base rate of spread in dry deciduous/pine fuels
  const baseRoS = 0.22; // km/h
  // Wind factor: exponential multiplier
  const windFactor = Math.pow(1 + 0.09 * weather.windSpeedKmh, 1.25);
  // Fuel moisture deficit factor (lower humidity = faster spread)
  const rhFactor = 1 + Math.max(0, 45 - weather.relativeHumidity) / 50;

  const rosKmh = Number((baseRoS * windFactor * rhFactor).toFixed(2));

  // Forward distances including initial cluster radius
  const initRadius = Math.max(0.3, extentKm);
  const forward3h = initRadius + rosKmh * 3;
  const forward6h = initRadius + rosKmh * 6;

  // Generate teardrop/ellipse polygon in polar coordinates around downwind bearing
  const buildFan = (distKm: number): [number, number][] => {
    const ring: [number, number][] = [];
    const downwind = weather.downwindBearingDeg;
    // Flank and backing spread ratios
    const flankRatio = Math.max(0.28, 0.45 - (weather.windSpeedKmh / 120));
    const backRatio = Math.max(0.1, 0.2 - (weather.windSpeedKmh / 200));

    // Sample 24 points around the perimeter
    for (let angle = 0; angle < 360; angle += 15) {
      const relAngle = ((angle - downwind + 540) % 360) - 180; // -180 to +180 relative to downwind
      const rad = toRad(relAngle);
      const cosVal = Math.cos(rad);

      let r: number;
      if (cosVal >= 0) {
        // Forward sector (downwind)
        r = distKm * (flankRatio + (1 - flankRatio) * Math.pow(cosVal, 1.8));
      } else {
        // Backing sector (into wind)
        r = distKm * (flankRatio + (backRatio - flankRatio) * Math.abs(cosVal));
      }

      ring.push(destinationPoint(origin, r, angle));
    }
    return ring;
  };

  return {
    hours3: buildFan(forward3h),
    hours6: buildFan(forward6h),
    forwardDistance3hKm: Number(forward3h.toFixed(1)),
    forwardDistance6hKm: Number(forward6h.toFixed(1)),
    rateOfSpreadKmh: rosKmh,
  };
}
