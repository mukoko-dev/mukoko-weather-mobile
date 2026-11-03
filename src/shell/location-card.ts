/**
 * The Locations screen's cards, as pure helpers: ported from mukoko-weather
 * `src/lib/location-card.ts` (`buildLocationList`, `cardAccessibleName`,
 * `tempLabel`, `highLowLabel`, `mapWithConcurrency`, the fetch concurrency)
 * with the same rules, adapted to the app's weather response.
 *
 * The web paints each card's sky from `.oryx-*` classes; the app uses the
 * same sky families as the weather page (`skyFamily`, src/theme/sky.ts).
 */

import { type WeatherResponse } from "@/api/weather";
import { skyFamily, type SkyFamily } from "@/shared/hero";
import { weatherCodeToInfo } from "@/shared/weather";

/** Parallel weather requests for the Locations list (the web's value). */
export const CARD_FETCH_CONCURRENCY = 3;

/** Whole-degree label: 25.4 → "25°", -0.6 → "-1°". */
export function tempLabel(value: number): string {
  return `${Math.round(value)}°`;
}

/** "HH:MM" on a place's own clock (the web's `localTimeLabel`). */
export function localTimeLabel(
  instant: Date | number | string,
  offsetSeconds: number,
): string {
  const ms = new Date(instant).getTime();
  if (!Number.isFinite(ms)) return "";
  const shifted = new Date(ms + offsetSeconds * 1000);
  const hh = String(shifted.getUTCHours()).padStart(2, "0");
  const mm = String(shifted.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** iOS-style high/low line: "H:27° L:17°". */
export function highLowLabel(high: number, low: number): string {
  return `H:${Math.round(high)}° L:${Math.round(low)}°`;
}

/** What one card shows once its weather has loaded. */
export interface CardSummary {
  temperature: number;
  high: number;
  low: number;
  condition: string;
  family: SkyFamily;
  /** The place's own clock, "14:05", or null without an offset. */
  localTime: string | null;
}

/** A card's display model from a weather answer; null when fields are missing. */
export function summarizeCard(
  weather: WeatherResponse | null | undefined,
  now: Date,
): CardSummary | null {
  const t = weather?.current?.temperature;
  const code = weather?.current?.weatherCode;
  const high = weather?.daily?.[0]?.tempMax;
  const low = weather?.daily?.[0]?.tempMin;
  if (
    typeof t !== "number" ||
    typeof code !== "number" ||
    typeof high !== "number" ||
    typeof low !== "number"
  ) {
    return null;
  }
  return {
    temperature: t,
    high,
    low,
    condition: weatherCodeToInfo(code).label,
    family: skyFamily(code, weather?.current?.isDay ?? true),
    localTime:
      typeof weather?.utcOffsetSeconds === "number"
        ? localTimeLabel(now, weather.utcOffsetSeconds)
        : null,
  };
}

/**
 * The card's accessible name, e.g. "Harare, 25°, Clear sky, high 27 low 17,
 * Home". Badges are appended so the list reads like the visual cues.
 */
export function cardAccessibleName(options: {
  name: string;
  summary: CardSummary | null;
  isCurrent?: boolean;
  isHome?: boolean;
}): string {
  const parts: string[] = [options.name];
  if (options.summary) {
    const s = options.summary;
    parts.push(
      tempLabel(s.temperature),
      s.condition,
      `high ${Math.round(s.high)} low ${Math.round(s.low)}`,
    );
  } else {
    parts.push("Weather unavailable");
  }
  if (options.isCurrent) parts.push("My location");
  if (options.isHome) parts.push("Home");
  return parts.join(", ");
}

export interface LocationListEntry {
  /** null for My Location (the GPS place has no saved slug). */
  slug: string | null;
  isCurrent: boolean;
}

/**
 * The list the Locations screen shows: My Location first, always, then the
 * saved places in their saved order, de-duplicated and capped.
 */
export function buildLocationList(
  savedSlugs: readonly string[],
  maxSaved: number,
): LocationListEntry[] {
  const entries: LocationListEntry[] = [{ slug: null, isCurrent: true }];
  const seen = new Set<string>();
  for (const slug of savedSlugs.slice(0, Math.max(0, maxSaved))) {
    if (!slug || seen.has(slug)) continue;
    entries.push({ slug, isCurrent: false });
    seen.add(slug);
  }
  return entries;
}

/**
 * Run `worker` over `items` with at most `limit` in flight. Results keep the
 * input order. The first worker error rejects the whole batch.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = Array.from({ length: items.length });
  let next = 0;
  const lanes = Math.max(1, Math.min(Math.floor(limit), items.length));
  const runLane = async (): Promise<void> => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: lanes }, () => runLane()));
  return results;
}
