/**
 * Air quality from the weather Worker: `GET /v1/air-quality?lat=&lon=`.
 *
 * The Worker answers the US EPA index (`aqi`, 0 to 500), its `level`, the seven
 * pollutants in µg/m³ (a gap is `null`), the EPA sub-index of each, the WHO
 * 2021 guidelines, and when it was fetched. It is read here defensively and
 * converted to the model the Air quality card and its detail read
 * (`AirQualityReading`, src/shared/air-quality-details.ts).
 *
 * The point is rounded to about 110 m before it leaves the phone.
 */

import { apiFetch, ROUTES } from "@/api/client";
import { roundCoord } from "@/api/weather";
import {
  type AirQualityReading,
  type PollutantKey,
  POLLUTANT_ORDER,
} from "@/shared/air-quality-details";

/** The reading plus the day-on-day trend, when the Worker sends one. */
export type AirQuality = AirQualityReading & {
  trend?: "worse" | "better" | "similar" | null;
};

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** A record of pollutant -> number, with a gap kept as `null` where asked. */
function byPollutant(
  raw: unknown,
  keepNull: boolean,
): Partial<Record<PollutantKey, number | null>> {
  const out: Partial<Record<PollutantKey, number | null>> = {};
  if (!raw || typeof raw !== "object") return out;
  const rec = raw as Record<string, unknown>;
  for (const key of POLLUTANT_ORDER) {
    const v = num(rec[key]);
    if (v !== null) out[key] = v;
    else if (keepNull && key in rec) out[key] = null;
  }
  return out;
}

/** The Worker's answer as a reading, or `null` when it holds no usable index. */
export function toAirQuality(raw: unknown): AirQuality | null {
  if (!raw || typeof raw !== "object") return null;
  const w = raw as Record<string, unknown>;
  const aqi = num(w.aqi);
  if (aqi === null || aqi < 0) return null;
  const dominant = POLLUTANT_ORDER.find((k) => k === w.dominantPollutant);
  const subIndexes = byPollutant(w.subIndexes, false);
  // With nothing scoreable the Worker answers `{aqi: 0, level: "good",
  // dominantPollutant: null}` and an empty `subIndexes`. That is "no
  // reading", not clean air: a card must never show it as a green 0.
  if (aqi === 0 && !dominant && Object.keys(subIndexes).length === 0) {
    return null;
  }
  const trend =
    w.trend === "worse" || w.trend === "better" || w.trend === "similar"
      ? w.trend
      : null;
  return {
    aqi,
    level: typeof w.level === "string" ? w.level : undefined,
    dominantPollutant: dominant ?? null,
    pollutants: byPollutant(w.pollutants, true),
    subIndexes: subIndexes as Partial<Record<PollutantKey, number>>,
    whoGuidelines: byPollutant(w.whoGuidelines, false) as Partial<
      Record<PollutantKey, number>
    >,
    source: typeof w.source === "string" ? w.source : undefined,
    fetchedAt: typeof w.fetchedAt === "string" ? w.fetchedAt : undefined,
    trend,
  };
}

export async function fetchAirQuality(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<AirQuality | null> {
  const raw = await apiFetch<unknown>(ROUTES.airQuality, {
    query: { lat: roundCoord(lat), lon: roundCoord(lon) },
    signal,
  });
  // The Worker answered, and there is nothing to score here: a state of its
  // own (no reading for this place), not a failure Try again could fix.
  if (isNothingScoreable(raw)) return null;
  const reading = toAirQuality(raw);
  if (!reading) throw new Error("Air quality is unavailable right now.");
  return reading;
}

/**
 * The Worker's "nothing scoreable" answer: `{aqi: 0, dominantPollutant: null}`
 * with empty `subIndexes`. Asking again gives the same answer.
 */
export function isNothingScoreable(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const w = raw as Record<string, unknown>;
  return (
    num(w.aqi) === 0 &&
    !POLLUTANT_ORDER.some((k) => k === w.dominantPollutant) &&
    Object.keys(byPollutant(w.subIndexes, false)).length === 0
  );
}
