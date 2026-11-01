/**
 * The last weather the app loaded for a place, kept in memory for a few
 * minutes so a detail page opens from the page that linked to it with no wait
 * and no second request. It is a convenience, not a store: it holds the
 * converted answer only, is lost when the app closes, and never outlives the
 * Worker's own cache by more than a few minutes. The network is still the only
 * source; the cache just remembers what it said.
 */

import { type WeatherResponse } from "@/api/weather";

/** How long a remembered answer is used. */
export const WEATHER_CACHE_TTL_MS = 5 * 60_000;
/** Most places remembered; the oldest is dropped first. */
export const WEATHER_CACHE_MAX = 12;

type Entry = { weather: WeatherResponse; at: number };

const entries = new Map<string, Entry>();

export function rememberWeather(
  slug: string,
  weather: WeatherResponse,
  at: number = Date.now(),
): void {
  entries.delete(slug);
  entries.set(slug, { weather, at });
  while (entries.size > WEATHER_CACHE_MAX) {
    const oldest = entries.keys().next().value;
    if (oldest === undefined) break;
    entries.delete(oldest);
  }
}

export function recallWeather(
  slug: string,
  now: number = Date.now(),
): WeatherResponse | undefined {
  const hit = entries.get(slug);
  if (!hit) return undefined;
  if (now - hit.at > WEATHER_CACHE_TTL_MS) {
    entries.delete(slug);
    return undefined;
  }
  return hit.weather;
}

export function clearWeatherCache(): void {
  entries.clear();
}
