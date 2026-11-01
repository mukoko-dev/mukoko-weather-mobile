/**
 * The data behind the /forecast and /atmosphere charts, ported from the web
 * (mukoko-weather `HourlyChart.prepareHourlyData`, `DailyChart.prepareDailyData`
 * and `AtmosphericDetails.prepareAtmosphericData`), with the web's test vectors
 * (src/shared/chart-data.test.ts).
 *
 * Every "current hour" and every hour label is read in the PLACE's time with
 * the forecast's UTC offset, never the phone's clock (src/shared/location-time).
 *
 * Two deliberate differences from the web, both about a value that is not
 * there:
 *   - a missing reading (null, NaN) stays `null` so the chart draws a gap; the
 *     web's `Math.round(null)` would draw it as 0;
 *   - a daily label is the weekday of the place's calendar date, read as a UTC
 *     calendar date (as the web's `DailyForecast` already does) so a phone west
 *     of UTC never shows "2026-10-08" as the 7th.
 */

import {
  currentHourIndex,
  locationClockLabel,
  resolveOffsetSeconds,
} from "./location-time";
import type { DailyWeather, HourlyWeather } from "./weather";

/** Hours in the hourly and atmospheric charts. */
export const CHART_HOURS = 24;

/** A reading, or `null` when the forecast has none for that hour or day. */
export type Reading = number | null;

function reading(v: unknown): Reading {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function rounded(v: unknown): Reading {
  const n = reading(v);
  return n === null ? null : Math.round(n);
}

// ---------------------------------------------------------------------------
// Hourly: the 24-hour forecast chart
// ---------------------------------------------------------------------------

export interface HourlyDataPoint {
  label: string;
  temp: Reading;
  feelsLike: Reading;
  rain: Reading;
}

/** The next 24 hours from the place's current hour: temperature, feels like, rain chance. */
export function prepareHourlyData(
  hourly: HourlyWeather,
  offsetSeconds?: number | null,
  now: Date = new Date(),
): HourlyDataPoint[] {
  // The LOCATION's current hour and labels, never the viewer's clock.
  const offset = resolveOffsetSeconds(offsetSeconds, now);
  const start = currentHourIndex(hourly.time, offset, now);

  const points: HourlyDataPoint[] = [];
  for (let i = 0; i < CHART_HOURS && start + i < hourly.time.length; i++) {
    const idx = start + i;
    points.push({
      label: i === 0 ? "Now" : locationClockLabel(hourly.time[idx], offset),
      temp: rounded(hourly.temperature_2m?.[idx]),
      feelsLike: rounded(hourly.apparent_temperature?.[idx]),
      rain: reading(hourly.precipitation_probability?.[idx]),
    });
  }
  return points;
}

// ---------------------------------------------------------------------------
// Daily: the 7-day forecast chart
// ---------------------------------------------------------------------------

export interface DailyDataPoint {
  day: string;
  high: Reading;
  low: Reading;
  feelsHigh: Reading;
  feelsLow: Reading;
  range: [Reading, Reading];
  rain: Reading;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** "Today", else the short weekday, of a `YYYY-MM-DD` place date. */
export function dayName(date: string, index: number): string {
  if (index === 0) return "Today";
  const d = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? "—" : WEEKDAYS[d.getUTCDay()];
}

/** The day of the month of a `YYYY-MM-DD` place date. */
export function dayOfMonth(date: string): number {
  return Number(date.slice(8, 10));
}

/** The days of the daily forecast: highs, lows, feels like and rain chance. */
export function prepareDailyData(daily: DailyWeather): DailyDataPoint[] {
  return (daily.time ?? []).map((date, i) => {
    const high = rounded(daily.temperature_2m_max?.[i]);
    const low = rounded(daily.temperature_2m_min?.[i]);
    return {
      day: dayName(date, i),
      high,
      low,
      feelsHigh: rounded(daily.apparent_temperature_max?.[i]),
      feelsLow: rounded(daily.apparent_temperature_min?.[i]),
      range: [low, high],
      rain: reading(daily.precipitation_probability_max?.[i]),
    };
  });
}

// ---------------------------------------------------------------------------
// Atmospheric: humidity, cloud, wind, pressure and UV over 24 hours
// ---------------------------------------------------------------------------

export interface AtmosphericDataPoint {
  label: string;
  humidity: Reading;
  cloudCover: Reading;
  pressure: Reading;
  windSpeed: Reading;
  windGusts: Reading;
  uvIndex: Reading;
}

/** The next 24 hours from the place's current hour. */
export function prepareAtmosphericData(
  hourly: HourlyWeather,
  offsetSeconds?: number | null,
  now: Date = new Date(),
): AtmosphericDataPoint[] {
  // The LOCATION's current hour and labels, never the viewer's clock.
  const offset = resolveOffsetSeconds(offsetSeconds, now);
  const start = currentHourIndex(hourly.time, offset, now);

  const points: AtmosphericDataPoint[] = [];
  for (let i = 0; i < CHART_HOURS && start + i < hourly.time.length; i++) {
    const idx = start + i;
    points.push({
      label: i === 0 ? "Now" : locationClockLabel(hourly.time[idx], offset),
      humidity: reading(hourly.relative_humidity_2m?.[idx]),
      cloudCover: reading(hourly.cloud_cover?.[idx]),
      pressure: rounded(hourly.surface_pressure?.[idx]),
      windSpeed: rounded(hourly.wind_speed_10m?.[idx]),
      windGusts: rounded(hourly.wind_gusts_10m?.[idx]),
      uvIndex: reading(hourly.uv_index?.[idx]),
    });
  }
  return points;
}
