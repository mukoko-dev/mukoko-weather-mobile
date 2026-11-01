/**
 * Small pure helpers the Conditions section reads, ported from mukoko-weather
 * `src/components/weather/AtmosphericSummary.tsx` (`aqiTrendSentence`,
 * `localIsoDate`, `todayHighFrom`) and the air-quality sentence it builds
 * inline. Pure: no network, no clock of its own.
 */

import { type AqiBand, AQI_BAND_LABELS } from "./aqi";
import {
  type PollutantKey,
  POLLUTANT_NAMES,
  POLLUTANT_SYMBOLS,
} from "./air-quality-details";
import { locationDateString, resolveOffsetSeconds } from "./location-time";
import { type DailyWeather } from "./weather";

/** One-line comparison with yesterday at the same hour, or null if unknown. */
export function aqiTrendSentence(
  trend: "worse" | "better" | "similar" | null | undefined,
): string | null {
  switch (trend) {
    case "worse":
      return "Worse than yesterday at this time.";
    case "better":
      return "Better than yesterday at this time.";
    case "similar":
      return "About the same as yesterday at this time.";
    default:
      return null;
  }
}

/**
 * The air-quality card's sentence: the band, the main pollutant and the trend.
 * `spoken` names the pollutant in words ("Fine particles") for VoiceOver; the
 * written form uses the symbol ("PM2.5") as the web does.
 */
export function aqiSentence(
  band: AqiBand,
  dominant: PollutantKey | null,
  trend: "worse" | "better" | "similar" | null | undefined,
  spoken = false,
): string {
  const pollutant = dominant
    ? spoken
      ? POLLUTANT_NAMES[dominant].toLowerCase()
      : POLLUTANT_SYMBOLS[dominant]
    : null;
  return [
    `${AQI_BAND_LABELS[band]}${pollutant ? `, mainly ${pollutant}` : ""}.`,
    aqiTrendSentence(trend),
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * The LOCATION's calendar date (YYYY-MM-DD) for the normals request. With no
 * offset it falls back to the viewer's calendar day.
 */
export function localIsoDate(
  now: Date,
  offsetSeconds?: number | null,
): string {
  return locationDateString(resolveOffsetSeconds(offsetSeconds, now), now);
}

/** Today's forecast high, or null when the daily series is empty. */
export function todayHighFrom(daily: DailyWeather | undefined): number | null {
  const v = daily?.temperature_2m_max?.[0];
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null;
}
