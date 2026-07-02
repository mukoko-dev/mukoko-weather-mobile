/**
 * Hourly-forecast extraction for the location detail screen.
 *
 * The typed `WeatherResponse` (src/api/weather.ts) only declares `current` and
 * `daily` — but the `/api/py/weather` response carries an untyped `hourly`
 * block at runtime (see the note in weather.ts: "new fields can be added
 * without breaking existing screens because we never use Object.keys"). Rather
 * than widen the shared, read-only type, we read `hourly` defensively here.
 *
 * Two shapes are tolerated so this keeps working whichever backend answers:
 *   1. Normalised array   — `hourly: [{ time, temperature, precipitationProbability, weatherCode, isDay }]`
 *      (mirrors how `daily: DailyForecast[]` is normalised).
 *   2. Open-Meteo columns — `hourly: { time: string[], temperature_2m: number[], ... }`
 *      (the raw shape mukoko-weather's worker / Python endpoints return).
 *
 * When no usable hourly data is present we return `[]` and the caller hides the
 * section — never a crash.
 */

import type { WeatherResponse } from '@/api/weather';

export type HourlyPoint = {
  /** ISO timestamp for the hour. */
  time: string;
  temperature: number | null;
  precipitationProbability: number | null;
  weatherCode: number | null;
  isDay: boolean;
};

type NormalizedHourEntry = {
  time?: unknown;
  temperature?: unknown;
  temp?: unknown;
  temperature_2m?: unknown;
  precipitationProbability?: unknown;
  precipitation_probability?: unknown;
  weatherCode?: unknown;
  weather_code?: unknown;
  isDay?: unknown;
  is_day?: unknown;
};

type OpenMeteoHourly = {
  time?: unknown;
  temperature_2m?: unknown;
  temperature?: unknown;
  precipitation_probability?: unknown;
  precipitationProbability?: unknown;
  weather_code?: unknown;
  weatherCode?: unknown;
  is_day?: unknown;
  isDay?: unknown;
};

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function truthyDay(v: unknown): boolean {
  // Missing day info defaults to daytime (brighter glyphs); 0 / false => night.
  if (v === undefined || v === null) return true;
  return Boolean(v);
}

function fromEntry(entry: NormalizedHourEntry): HourlyPoint | null {
  if (!entry || typeof entry.time !== 'string') return null;
  return {
    time: entry.time,
    temperature: num(entry.temperature ?? entry.temp ?? entry.temperature_2m),
    precipitationProbability: num(
      entry.precipitationProbability ?? entry.precipitation_probability,
    ),
    weatherCode: num(entry.weatherCode ?? entry.weather_code),
    isDay: truthyDay(entry.isDay ?? entry.is_day),
  };
}

function fromColumns(hourly: OpenMeteoHourly): HourlyPoint[] {
  const times = hourly.time;
  if (!Array.isArray(times)) return [];
  const temps = (hourly.temperature_2m ?? hourly.temperature) as unknown[] | undefined;
  const precip = (hourly.precipitation_probability ?? hourly.precipitationProbability) as
    | unknown[]
    | undefined;
  const codes = (hourly.weather_code ?? hourly.weatherCode) as unknown[] | undefined;
  const day = (hourly.is_day ?? hourly.isDay) as unknown[] | undefined;

  return times.flatMap((time, i) => {
    if (typeof time !== 'string') return [];
    return [
      {
        time,
        temperature: num(temps?.[i]),
        precipitationProbability: num(precip?.[i]),
        weatherCode: num(codes?.[i]),
        isDay: truthyDay(day?.[i]),
      },
    ];
  });
}

/**
 * Pull the next `limit` hours of forecast out of a weather response.
 *
 * Filters to hours at or after the start of the current hour; if every
 * timestamp is in the past (or unparseable) it falls back to the head of the
 * series so the section still renders something sensible.
 */
export function extractHourly(weather: WeatherResponse, limit = 24): HourlyPoint[] {
  const raw = (weather as unknown as { hourly?: unknown }).hourly;

  let points: HourlyPoint[] = [];
  if (Array.isArray(raw)) {
    points = raw
      .map((e) => fromEntry(e as NormalizedHourEntry))
      .filter((p): p is HourlyPoint => p !== null);
  } else if (raw && typeof raw === 'object') {
    points = fromColumns(raw as OpenMeteoHourly);
  }

  if (points.length === 0) return [];

  // Include the in-progress hour by rewinding one hour before "now".
  const cutoff = Date.now() - 60 * 60 * 1000;
  const upcoming = points.filter((p) => {
    const t = Date.parse(p.time);
    return Number.isNaN(t) || t >= cutoff;
  });

  return (upcoming.length > 0 ? upcoming : points).slice(0, limit);
}
