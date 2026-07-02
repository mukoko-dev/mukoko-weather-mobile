/**
 * Hourly forecast extraction.
 *
 * The Python `/api/py/weather` endpoint returns an `hourly` block of parallel
 * arrays (`time`, `temperature_2m`, `weather_code`, `precipitation_probability`,
 * …) — see `api/py/_weather.py`. The mobile `WeatherResponse` type only
 * declares the fields the UI consumed before hourly existed, so we read the
 * hourly block defensively here and zip the arrays into row objects.
 *
 * Pure module (no React) so the zipping + labelling logic is unit-testable.
 */

import { type WeatherResponse } from '@/api/weather';

/** Raw parallel-array hourly block as emitted by the weather API. */
type RawHourly = {
  time?: (string | null)[];
  temperature_2m?: (number | null)[];
  weather_code?: (number | null)[];
  precipitation_probability?: (number | null)[];
};

/** One zipped hour of forecast. */
export type HourlyPoint = {
  /** ISO-8601 timestamp for the hour. */
  time: string;
  temp: number | null;
  weatherCode: number | null;
  /** Precipitation probability (%), when the provider supplies it. */
  precipProb: number | null;
};

function readHourly(weather: WeatherResponse): RawHourly {
  // `hourly` isn't on the public type; read it through an index cast.
  const block = (weather as unknown as { hourly?: RawHourly }).hourly;
  return block ?? {};
}

/**
 * Zip the hourly parallel arrays into up to `maxHours` `HourlyPoint`s.
 * Entries without a timestamp are skipped. Missing metric arrays yield
 * `null` values rather than throwing.
 */
export function extractHourly(weather: WeatherResponse, maxHours = 24): HourlyPoint[] {
  const h = readHourly(weather);
  const times = h.time ?? [];
  const temps = h.temperature_2m ?? [];
  const codes = h.weather_code ?? [];
  const probs = h.precipitation_probability ?? [];

  const points: HourlyPoint[] = [];
  const limit = Math.min(times.length, maxHours);
  for (let i = 0; i < limit; i += 1) {
    const time = times[i];
    if (!time) continue;
    points.push({
      time,
      temp: temps[i] ?? null,
      weatherCode: codes[i] ?? null,
      precipProb: probs[i] ?? null,
    });
  }
  return points;
}

/** True for daytime hours (06:00–18:59) — drives day/night hero + icon tint. */
export function isDaytime(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 6 && hour < 19;
}

/**
 * Short label for an hourly cell. Index 0 is the current hour (the API's
 * `current` block is the first hourly sample), so it reads "Now"; later
 * hours format as a locale hour (e.g. "3 PM"). Falls back to the raw hour
 * if the timestamp can't be parsed.
 */
export function hourLabel(iso: string, index: number): string {
  if (index === 0) return 'Now';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, { hour: 'numeric' });
}
