/**
 * Device weather: how old a forecast kept on the phone may be and still be
 * shown, and how it is re-based on "now" first (issue #69). Ported from the
 * web's `src/lib/device-weather.ts` (its rules, its limits, its labels); this
 * file is pure, the reading and writing is src/state/forecast-store.ts.
 *
 * Rules (the web's):
 * - Only real forecasts are kept, never the seasonal estimate.
 * - Up to 60 minutes old, the stored `current` block is shown as it is.
 * - Older than that, `current` is rebuilt from the forecast hour for "now",
 *   read in the place's own time zone, and the page says it is a forecast.
 * - Once the stored hourly forecast no longer reaches "now", it is not shown.
 *
 * It works on the Worker's own body (Open-Meteo's column names), so the stored
 * copy goes through the same conversion as a live answer.
 */

import {
  currentWallHourMs,
  locationDateString,
  wallClockMs,
  weatherOffsetSeconds,
  wallNaiveIso,
} from "./location-time";

/** The parts of the Worker's body the rules read. */
export type StoredBody = {
  current?: Record<string, unknown>;
  hourly?: Record<string, unknown>;
  daily?: Record<string, unknown>;
  utc_offset_seconds?: unknown;
  minutely?: unknown;
  models?: unknown;
  models_time?: unknown;
  [key: string]: unknown;
};

/** Places kept: My Location, up to 10 saved places, a few recently viewed. */
export const MAX_STORED_PLACES = 20;
/** One body larger than this is not stored (a malformed or bloated answer). */
export const MAX_ENTRY_BYTES = 150_000;
/** Up to this age the stored `current` block is shown as current. */
export const CURRENT_MAX_AGE_MS = 60 * 60 * 1000;

const HOUR_MS = 60 * 60 * 1000;

export type Freshness = "current" | "forecast";

function strings(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string")
    : [];
}

function offsetOf(body: StoredBody, now: Date): number {
  const o = body.utc_offset_seconds;
  return weatherOffsetSeconds(
    { utc_offset_seconds: typeof o === "number" ? o : undefined },
    now,
  );
}

/**
 * The body as stored. The model comparison and the minutely nowcast are
 * dropped: they are large, go stale within minutes, and are fetched fresh.
 */
export function slimBody(body: StoredBody): StoredBody {
  const out: StoredBody = { ...body };
  delete out.models;
  delete out.models_time;
  delete out.minutely;
  return out;
}

/** The instant the stored hourly forecast runs out (epoch ms), or null. */
export function forecastEndsAt(
  body: StoredBody,
  now: Date = new Date(),
): number | null {
  const times = strings(body.hourly?.time);
  if (times.length === 0) return null;
  const offset = offsetOf(body, now);
  const lastWall = wallClockMs(times[times.length - 1], offset);
  if (lastWall === null) return null;
  return lastWall - offset * 1000 + HOUR_MS;
}

/**
 * How a stored body should be shown right now: as current conditions, as the
 * forecast for this hour, or (null) not at all.
 */
export function freshnessOf(
  fetchedAt: number,
  body: StoredBody,
  now: number = Date.now(),
): Freshness | null {
  const ends = forecastEndsAt(body, new Date(now));
  if (ends === null || now >= ends) return null;
  // A clock jump or a corrupt timestamp: never call this "current".
  if (!Number.isFinite(fetchedAt) || fetchedAt > now + 5 * 60 * 1000) {
    return "forecast";
  }
  return now - fetchedAt <= CURRENT_MAX_AGE_MS ? "current" : "forecast";
}

/**
 * The body re-based on "now" at the place: hourly starts at the current hour,
 * daily starts today, and for a `forecast` view `current` is the forecast for
 * this hour (its `time` too, so the hours line up behind it).
 */
export function rebaseBody(
  body: StoredBody,
  freshness: Freshness,
  now: number = Date.now(),
): StoredBody {
  const nowDate = new Date(now);
  const offset = offsetOf(body, nowDate);
  const hourStart = currentWallHourMs(offset, nowDate);
  const hourly = body.hourly ?? {};
  const daily = body.daily ?? {};
  let hi = strings(hourly.time).findIndex((t) => {
    const k = wallClockMs(t, offset);
    return k !== null && k >= hourStart;
  });
  if (hi < 0) hi = 0;
  const today = locationDateString(offset, nowDate);
  const days = strings(daily.time);
  let di = days.findIndex((d) => d.slice(0, 10) >= today);
  if (di < 0) di = Math.max(0, days.length - 1);

  const sliceAll = (obj: Record<string, unknown>, from: number) => {
    if (from === 0) return obj;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = Array.isArray(v) ? v.slice(from) : v;
    }
    return out;
  };

  const rebased: StoredBody = {
    ...body,
    hourly: sliceAll(hourly, hi),
    daily: sliceAll(daily, di),
  };
  delete rebased.minutely;

  if (freshness === "forecast" && rebased.hourly) {
    const h = rebased.hourly;
    const c = body.current ?? {};
    const at = (key: string): unknown => {
      const series = h[key];
      const v = Array.isArray(series) ? series[0] : undefined;
      return typeof v === "number" && Number.isFinite(v) ? v : c[key];
    };
    const first = strings(h.time)[0];
    rebased.current = {
      ...c,
      time: first ?? wallNaiveIso(hourStart),
      temperature_2m: at("temperature_2m"),
      apparent_temperature: at("apparent_temperature"),
      relative_humidity_2m: at("relative_humidity_2m"),
      precipitation: at("precipitation"),
      weather_code: at("weather_code"),
      cloud_cover: at("cloud_cover"),
      wind_speed_10m: at("wind_speed_10m"),
      wind_direction_10m: at("wind_direction_10m"),
      wind_gusts_10m: at("wind_gusts_10m"),
      uv_index: at("uv_index"),
      surface_pressure: at("surface_pressure"),
      is_day: at("is_day"),
    };
  }
  return rebased;
}

/** "Updated just now" / "Updated 12 min ago" / "Updated 3 h ago" / "Updated 2 days ago". */
export function updatedAgoLabel(
  fetchedAt: number,
  now: number = Date.now(),
): string {
  const ms = Math.max(0, now - fetchedAt);
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "Updated just now";
  if (min < 60) return `Updated ${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 48) return `Updated ${h} h ago`;
  return `Updated ${Math.floor(h / 24)} days ago`;
}
