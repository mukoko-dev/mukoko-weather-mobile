/**
 * The two reads behind the agriculture page's "past 30 days against normal"
 * card, both from the weather Worker:
 *   GET /v1/history?location=&days=30   the days recorded for a place
 *   GET /v1/normals?lat=&lon=&date=     the 1991 to 2020 high and low for a day
 *
 * A history can take a while the first time (days not stored yet are fetched
 * from the climate archives), so it waits up to 20 seconds and a short range is
 * tried once more after a network error, as the web does. The point for the
 * normals is rounded to about 110 m.
 */

import { apiFetch, ROUTES } from "@/api/client";
import {
  type HistoryAnswer,
  type Normals,
  WINDOW_DAYS,
  averageNormals,
  isoDaysAgo,
  readHistoryAnswer,
  readNormals,
} from "@/shared/agri-history";

/** How long a first view may wait for the archives. */
export const HISTORY_TIMEOUT_MS = 20_000;

function roundCoord(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** An abort signal that fires when `signal` does or after `ms`. */
function withTimeout(
  signal: AbortSignal | undefined,
  ms: number,
): { signal: AbortSignal; done: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const onAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", onAbort);
  return {
    signal: controller.signal,
    done: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    },
  };
}

/** The last 30 days recorded for a place, with the Worker's own flags. */
export async function fetchHistory30(
  slug: string,
  signal?: AbortSignal,
): Promise<HistoryAnswer> {
  let lastError: unknown;
  // One retry: a 30-day range is short enough to be worth asking twice.
  for (let attempt = 0; attempt < 2; attempt++) {
    if (signal?.aborted) break;
    const timed = withTimeout(signal, HISTORY_TIMEOUT_MS);
    try {
      return readHistoryAnswer(
        await apiFetch<unknown>(ROUTES.history, {
          query: { location: slug, days: WINDOW_DAYS },
          signal: timed.signal,
        }),
      );
    } catch (err) {
      lastError = err;
    } finally {
      timed.done();
    }
  }
  throw lastError ?? new Error("History could not be loaded.");
}

/** The normals for one day, `{available:false}` when the Worker has none. */
export async function fetchNormalsOn(
  lat: number,
  lon: number,
  date: string,
  signal?: AbortSignal,
): Promise<Normals> {
  try {
    return readNormals(
      await apiFetch<unknown>(ROUTES.normals, {
        query: { lat: roundCoord(lat), lon: roundCoord(lon), date },
        signal,
      }),
    );
  } catch (err) {
    if (signal?.aborted) throw err;
    return { available: false };
  }
}

/**
 * The normals across the 30-day window: the mean of those at both ends.
 * Sequential on purpose: the first call builds the cell's table (cached
 * afterwards), the second reads it.
 */
export async function fetchWindowNormals(
  lat: number,
  lon: number,
  signal?: AbortSignal,
  nowMs: number = Date.now(),
): Promise<Normals> {
  const end = await fetchNormalsOn(lat, lon, isoDaysAgo(0, nowMs), signal);
  const start = end.available
    ? await fetchNormalsOn(
        lat,
        lon,
        isoDaysAgo(WINDOW_DAYS - 1, nowMs),
        signal,
      )
    : end;
  return averageNormals(start, end);
}
