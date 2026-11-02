/**
 * The haze panel from the weather Worker: `GET /v1/haze?lat=&lon=`.
 *
 * Smoke, dust, urban smog or mist, how heavy, the visibility and PM2.5 behind
 * it, the regional haze season and, where one exists, the official reading
 * (Singapore's NEA PSI). The Worker always answers 200; `available: false`
 * (with a `reason`) means it had nothing to say. Read defensively here and
 * converted to `HazeResponse` (src/shared/haze.ts).
 */

import { apiFetch, ROUTES } from "@/api/client";
import { roundCoord } from "@/api/weather";
import {
  type HazeLevel,
  type HazeOfficial,
  type HazeResponse,
  type HazeSeason,
  type HazeSeasonType,
  type HazeType,
  HAZE_LEVEL_ORDER,
} from "@/shared/haze";

const TYPES: readonly HazeType[] = ["clear", "smoke", "dust", "smog", "mist"];
const SEASON_TYPES: readonly HazeSeasonType[] = ["smoke", "dust", "smog"];

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function toSeason(raw: unknown): HazeSeason | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const name = str(s.name);
  const type = SEASON_TYPES.find((t) => t === s.typicalType);
  if (!name || !type) return null;
  return {
    name,
    active: s.active === true,
    typicalMonths: Array.isArray(s.typicalMonths)
      ? s.typicalMonths.filter((m): m is number => typeof m === "number")
      : [],
    typicalType: type,
  };
}

function toOfficial(raw: unknown): HazeOfficial | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const source = str(o.source);
  const metric = str(o.metric);
  const value = num(o.value);
  const band = str(o.band);
  const region = str(o.region);
  if (!source || !metric || value === null || !band || !region) return null;
  return {
    source,
    metric,
    value,
    band,
    region,
    observedAt: str(o.observedAt),
  };
}

export function toHaze(raw: unknown): HazeResponse {
  const w = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const level = HAZE_LEVEL_ORDER.find((l): l is HazeLevel => l === w.level);
  const type = TYPES.find((t) => t === w.type);
  return {
    available: w.available === true && Boolean(level) && Boolean(type),
    reason: str(w.reason),
    level: level ?? null,
    type: type ?? null,
    headline: str(w.headline),
    advice: Array.isArray(w.advice)
      ? w.advice.filter((a): a is string => typeof a === "string")
      : [],
    visibilityKm: num(w.visibilityKm),
    pm25: num(w.pm25),
    pm25Mean: num(w.pm25Mean),
    dust: num(w.dust),
    aod: num(w.aod),
    usAqi: num(w.usAqi),
    relativeHumidity: num(w.relativeHumidity),
    peakTime: str(w.peakTime),
    season: toSeason(w.season),
    official: toOfficial(w.official),
    attribution: str(w.attribution) ?? "",
    fetchedAt: str(w.fetchedAt) ?? "",
  };
}

export async function fetchHaze(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<HazeResponse> {
  const raw = await apiFetch<unknown>(ROUTES.haze, {
    query: { lat: roundCoord(lat), lon: roundCoord(lon) },
    signal,
  });
  return toHaze(raw);
}
