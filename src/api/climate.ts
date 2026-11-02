/**
 * Climate context from the weather Worker, for the Averages detail and tile:
 *   GET /v1/normals?lat=&lon=&date=     today's normal high (ERA5 1991-2020)
 *   GET /v1/normals/monthly?lat=&lon=   the twelve monthly normals
 *   GET /v1/history?location=&days=30   the days recorded for a place
 *
 * Each answers 200 with `available: false` and a `reason` when it has nothing
 * (a breaker open, no data for the cell); a missing value stays `null` and is
 * never turned into zero. The parsing is the web's own
 * (src/shared/climate-averages.ts). The point is rounded to about 110 m.
 */

import { apiFetch, ROUTES } from "@/api/client";
import { roundCoord } from "@/api/weather";
import {
  type ParsedMonthlyNormals,
  type RecentDay,
  parseMonthlyNormals,
  recentDaysFromHistory,
} from "@/shared/climate-averages";

/** Today's normal high in °C, or `null` when the Worker has none. */
export function parseNormalHigh(raw: unknown): number | null {
  if (!raw || typeof raw !== "object") return null;
  const w = raw as { available?: unknown; normalHigh?: unknown };
  return w.available === true &&
    typeof w.normalHigh === "number" &&
    Number.isFinite(w.normalHigh)
    ? w.normalHigh
    : null;
}

export async function fetchNormalHigh(
  lat: number,
  lon: number,
  date: string,
  signal?: AbortSignal,
): Promise<number | null> {
  return parseNormalHigh(
    await apiFetch<unknown>(ROUTES.normals, {
      query: { lat: roundCoord(lat), lon: roundCoord(lon), date },
      signal,
    }),
  );
}

export async function fetchMonthlyNormals(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<ParsedMonthlyNormals> {
  const parsed = parseMonthlyNormals(
    await apiFetch<unknown>(ROUTES.normalsMonthly, {
      query: { lat: roundCoord(lat), lon: roundCoord(lon) },
      signal,
    }),
  );
  if (!parsed) throw new Error("Monthly averages are unavailable.");
  return parsed;
}

/**
 * The last 30 recorded days of a catalogue place. Only a place the app holds a
 * slug for has a history; a point from a GPS fix has none to ask for.
 */
export async function fetchRecentDays(
  slug: string,
  signal?: AbortSignal,
): Promise<RecentDay[]> {
  return recentDaysFromHistory(
    await apiFetch<unknown>(ROUTES.history, {
      query: { location: slug, days: 30 },
      signal,
    }),
  );
}
