/**
 * Sunrise, sunset and daylight for today, ported from the web's `SunTimes`
 * (mukoko-weather `src/components/weather/SunTimes.tsx`). Both times are the
 * PLACE's own clock, wherever the phone is.
 *
 * Two differences from the web: the daylight length is worked out in whole
 * minutes first, so 11 h 59.6 min reads "12h 0m", not the web's "11h 60m"; and
 * a missing time is spoken as "unavailable", not as "at --:--".
 */

import type { DailyWeather } from "./weather";
import {
  resolveOffsetSeconds,
  wallClockLabel,
  wallClockMs,
} from "./location-time";

export type SunTimes = {
  sunrise: string;
  sunset: string;
  daylight: string;
  /** What VoiceOver reads for each, in words. */
  sunriseSpoken: string;
  sunsetSpoken: string;
  daylightSpoken: string;
  hasDaylight: boolean;
};

const MISSING = "--:--";
const MINUTE_MS = 60_000;

/** Today's sun times from the daily forecast, in the place's time. */
export function sunTimes(
  daily: Pick<DailyWeather, "sunrise" | "sunset"> | undefined,
  utcOffsetSeconds?: number | null,
  now: Date = new Date(),
): SunTimes {
  const offset = resolveOffsetSeconds(utcOffsetSeconds, now);
  const rise = wallClockMs(daily?.sunrise?.[0], offset);
  const set = wallClockMs(daily?.sunset?.[0], offset);
  const label = (wall: number | null) =>
    wall === null ? MISSING : wallClockLabel(wall);

  const hasDaylight = rise !== null && set !== null && set >= rise;
  const minutes = hasDaylight ? Math.round((set - rise) / MINUTE_MS) : 0;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return {
    sunrise: label(rise),
    sunset: label(set),
    daylight: hasDaylight ? `${hours}h ${rest}m` : "--",
    sunriseSpoken: rise === null ? "Sunrise unavailable" : `Sunrise at ${label(rise)}`,
    sunsetSpoken: set === null ? "Sunset unavailable" : `Sunset at ${label(set)}`,
    daylightSpoken: hasDaylight
      ? `${hours} hours and ${rest} minutes of daylight`
      : "Daylight unavailable",
    hasDaylight,
  };
}
