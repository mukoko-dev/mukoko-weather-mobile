/**
 * The two reads behind the agriculture page's "past 30 days against normal"
 * card, both from the weather Worker:
 *   GET /v1/history?location=&days=30   the days recorded for a place
 *   GET /v1/normals?lat=&lon=&date=     the 1991 to 2020 high and low for a day
 *
 * A history can take a while the first time (days not stored yet are fetched
 * from the climate archives), so it waits up to 20 seconds and a short range is
 * tried once more after a network failure or a 5xx, as the web does (never after
 * a 4xx such as the 429 rate limit, and never after a timeout). The point for
 * the normals is rounded to about 110 m.
 */

import { ApiError, NetworkError, apiFetch, ROUTES } from "@/api/client";
import {
  type HistoryAnswer,
  type Normals,
  WINDOW_DAYS,
  averageNormals,
  isoDaysAgo,
  readHistoryAnswer,
  readNormals,
} from "@/shared/agri-history";
import { queryDegrees } from "@/shared/agriculture";

/** How long a first view may wait for the archives. */
export const HISTORY_TIMEOUT_MS = 20_000;

/**
 * Whether a failed history request is worth asking again: the request never
 * got an answer (the network failed) or the Worker failed (5xx). Never a 4xx
 * (a 429 is the rate limit, and asking again spends more of the budget), and
 * never a timeout (`NetworkError` "timeout") or a caller that left
 * (`AbortError`): a second wait of 20 s
 * would double the first view's worst case to 40 s).
 */
export function worthRetrying(err: unknown): boolean {
  if (err instanceof ApiError) return err.status >= 500;
  if (err instanceof NetworkError) return err.kind === "offline";
  if (err instanceof Error && err.name === "AbortError") return false;
  return true;
}

/** The last 30 days recorded for a place, with the Worker's own flags. */
export async function fetchHistory30(
  slug: string,
  signal?: AbortSignal,
): Promise<HistoryAnswer> {
  let lastError: unknown;
  // One retry for a network failure or a 5xx: a 30-day range is short enough
  // to be worth asking twice.
  for (let attempt = 0; attempt < 2; attempt++) {
    if (signal?.aborted) break;
    try {
      return readHistoryAnswer(
        await apiFetch<unknown>(ROUTES.history, {
          query: { location: slug, days: WINDOW_DAYS },
          signal,
          timeoutMs: HISTORY_TIMEOUT_MS,
        }),
      );
    } catch (err) {
      lastError = err;
      if (!worthRetrying(err)) break;
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
  // A failed request rejects (the card offers Try again); the Worker saying it
  // has no normals here is `available: false`, a state of its own.
  return readNormals(
    await apiFetch<unknown>(ROUTES.normals, {
      query: { lat: queryDegrees(lat), lon: queryDegrees(lon), date },
      signal,
    }),
  );
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
    ? await fetchNormalsOn(lat, lon, isoDaysAgo(WINDOW_DAYS - 1, nowMs), signal)
    : end;
  return averageNormals(start, end);
}
