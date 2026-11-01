/**
 * The agriculture page's "past 30 days against normal" card: reading the
 * Worker's `/v1/history` answer, the notes under it, and the normals for the
 * two ends of the window.
 *
 * Ported from mukoko-weather `src/lib/history-api.ts` (`readHistoryAnswer`,
 * `DEGRADED_NOTE`, `HISTORY_FAILED_NOTE`) and the helpers inside
 * `AgricultureHistory.tsx` (`averageNormals`, `isoDaysAgo`) with the same
 * rules. Only the parts this card uses are here.
 */

/** What the card reads of the history answer. */
export interface HistoryAnswer {
  /** One document per day, newest first; each has `daily.<field>[0]`. */
  data: unknown[];
  /** Part of the range could not be loaded (not the archive's plain lag). */
  degraded: boolean;
  /** Past dates still without a day (an archive lags a few days). */
  missing: number;
}

/** Shown when the answer is incomplete for a reason other than the archive lag. */
export const DEGRADED_NOTE =
  "Some history could not be loaded just now, so this may be incomplete. Try again in a moment.";

/** Shown when the history request itself failed. */
export const HISTORY_FAILED_NOTE = "History could not be loaded just now.";

/** Read a `/v1/history` body defensively: anything unreadable is an empty, not-degraded answer. */
export function readHistoryAnswer(json: unknown): HistoryAnswer {
  const b =
    typeof json === "object" && json !== null
      ? (json as Record<string, unknown>)
      : {};
  return {
    data: Array.isArray(b.data) ? b.data : [],
    degraded: b.degraded === true,
    missing: typeof b.missing === "number" ? b.missing : 0,
  };
}

/** The Worker's `GET /v1/normals` answer: the 1991 to 2020 high and low for a day. */
export interface Normals {
  available: boolean;
  normalHigh?: number | null;
  normalLow?: number | null;
}

/**
 * The mean of the normals at both ends of the window. Temperatures slope
 * across 30 days, so one day's normal would mislead. When one end is missing
 * the other stands alone; when both are, nothing is known.
 */
export function averageNormals(a: Normals, b: Normals): Normals {
  if (!a.available || !b.available) return b.available ? b : a;
  const avg = (x?: number | null, y?: number | null) =>
    typeof x === "number" && typeof y === "number"
      ? Math.round(((x + y) / 2) * 10) / 10
      : (x ?? y ?? null);
  return {
    available: true,
    normalHigh: avg(a.normalHigh, b.normalHigh),
    normalLow: avg(a.normalLow, b.normalLow),
  };
}

/** `YYYY-MM-DD` for `n` days before `nowMs` (the normals only use month and day). */
export function isoDaysAgo(n: number, nowMs: number = Date.now()): string {
  return new Date(nowMs - n * 86_400_000).toISOString().slice(0, 10);
}

/** Days in the comparison window. */
export const WINDOW_DAYS = 30;

/** Read a `/v1/normals` body: `available: true` only when it says so. */
export function readNormals(json: unknown): Normals {
  if (typeof json !== "object" || json === null) return { available: false };
  const b = json as Record<string, unknown>;
  if (b.available !== true) return { available: false };
  const num = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  return {
    available: true,
    normalHigh: num(b.normalHigh),
    normalLow: num(b.normalLow),
  };
}
