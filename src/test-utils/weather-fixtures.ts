/**
 * A recorded answer from the weather API (Harare, 2026-11-01 02:45 local, a
 * clear night) converted by the app's own converter, plus the fixed instant the
 * tests treat as "now": 00:45 UTC, which is 02:45 in Harare (UTC+2).
 */

import weatherHarare from "@/api/__fixtures__/weather-harare.json";
import { toWeatherResponse, type WeatherResponse } from "@/api/weather";

export const NOW = new Date(Date.UTC(2026, 10, 1, 0, 45));
export const HARARE_OFFSET = 7200;

const PLACE = {
  slug: "harare",
  name: "Harare",
  province: "Harare",
  country: "Zimbabwe",
  lat: -17.8252,
  lon: 31.0335,
};

export function harareWeather(): WeatherResponse {
  return toWeatherResponse(
    weatherHarare as never,
    { provider: "open-meteo:blend", fetchedAt: "2026-11-01T00:45:00Z" },
    PLACE as never,
  );
}

/** The same answer with the whole forecast turned into one condition. */
export function withCondition(
  code: number,
  isDay: number,
  extra: Record<string, number> = {},
): WeatherResponse {
  const raw = JSON.parse(JSON.stringify(weatherHarare)) as typeof weatherHarare;
  raw.current.weather_code = code;
  raw.current.is_day = isDay;
  raw.hourly.weather_code = raw.hourly.weather_code.map(() => code);
  raw.hourly.is_day = raw.hourly.is_day.map(() => isDay);
  for (const [k, v] of Object.entries(extra)) {
    (raw.hourly as unknown as Record<string, number[]>)[k] =
      raw.hourly.time.map(() => v);
    // The current block carries the same reading when it has that column.
    if (k in raw.current)
      (raw.current as unknown as Record<string, number>)[k] = v;
  }
  return toWeatherResponse(raw as never, {}, PLACE as never);
}

/** Every string rendered in a test tree, joined (for the emoji scan). */
export function allText(node: unknown): string {
  if (node === null || node === undefined) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(allText).join(" ");
  const n = node as { children?: unknown };
  return allText(n.children);
}

/** True when the string holds an emoji or pictographic symbol. */
export const HAS_EMOJI = /\p{Extended_Pictographic}/u;
