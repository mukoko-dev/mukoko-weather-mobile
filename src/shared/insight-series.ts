/**
 * Series the insight tiles draw, read in the PLACE's time.
 *
 * `next24hPrecipSeries` is ported verbatim from mukoko-weather
 * `src/components/weather/AtmosphericSummary.tsx`: hourly precipitation (mm)
 * for the next 24 slots from the place's current hour (the payload's
 * `utc_offset_seconds`; the phone's clock is only a fallback for a payload that
 * has no offset).
 */

import type { HourlyWeather } from "./weather";
import {
  currentWallHourMs,
  resolveOffsetSeconds,
  wallClockMs,
} from "./location-time";

export function next24hPrecipSeries(
  hourly: HourlyWeather | undefined,
  now: Date,
  offsetSeconds?: number | null,
): number[] {
  const times = hourly?.time ?? [];
  const offset = resolveOffsetSeconds(offsetSeconds, now);
  const hourStart = currentWallHourMs(offset, now);
  const start = times.findIndex((t) => {
    const k = wallClockMs(t, offset);
    return k !== null && k >= hourStart;
  });
  if (start === -1) return [];
  return (hourly?.precipitation ?? [])
    .slice(start, start + 24)
    .map((v) => (Number.isFinite(v) ? v : 0));
}
