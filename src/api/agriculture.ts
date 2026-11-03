/**
 * Farm weather from the weather Worker: `GET /v1/agriculture`.
 *
 * Public (no sign-in). One answer carries the day's verdict, the spray, plant,
 * harvest and irrigate windows, rain, soil, the water balance, growing degree
 * days, frost and heat risk, a 46-day series (30 past, 16 forecast) and the
 * place's crop calendar. The Worker ALWAYS answers HTTP 200 for a valid point:
 * when it cannot build the picture it says `available: false` and a `reason`
 * (`provider_unavailable`, `provider_error`, `insufficient_data`,
 * `analysis_error`). That is an outcome the screens design for, so it is a
 * value here (`kind: "unavailable"`), not an error. A thrown error means the
 * request itself failed (offline, a bad status, an unreadable body).
 */

import { ApiError, apiFetch, ROUTES } from "@/api/client";
import {
  type AgriLocationRef,
  type AgricultureResponse,
  agricultureQuery,
  isAgricultureReady,
} from "@/shared/agriculture";

export type AgricultureResult =
  | { kind: "ready"; data: AgricultureResponse & { headline: string } }
  | {
      kind: "unavailable";
      /** The Worker's reason, or null when it gave none. */
      reason: string | null;
      /** The attribution line the Worker sent, if any. */
      attribution: string | null;
    };

function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

/**
 * Read the Worker's answer. A body that is not an object is a failed request.
 * `available: true` without the groups the card needs (windows, rain, headline,
 * verdict) is unavailable too: nothing is papered over with a made-up line.
 */
export function readAgriculture(raw: unknown): AgricultureResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ApiError(
      "The farm data could not be read.",
      502,
      ROUTES.agriculture,
    );
  }
  const b = raw as Record<string, unknown>;
  const attribution = strOrNull(b.attribution);
  if (b.available !== true) {
    return { kind: "unavailable", reason: strOrNull(b.reason), attribution };
  }
  const data = {
    ...b,
    sprayWindows: Array.isArray(b.sprayWindows) ? b.sprayWindows : [],
    daily: Array.isArray(b.daily) ? b.daily : [],
    calendar: Array.isArray(b.calendar) ? b.calendar : [],
    crops: Array.isArray(b.crops) ? b.crops : [],
    attribution: attribution ?? "",
  } as unknown as AgricultureResponse;
  if (!isAgricultureReady(data)) {
    return { kind: "unavailable", reason: null, attribution };
  }
  return { kind: "ready", data };
}

/** How long a farm answer is reused between screens (card, then page). */
export const AGRICULTURE_TTL_MS = 10 * 60 * 1000;

const cache = new Map<string, { result: AgricultureResult; at: number }>();
const inflight = new Map<string, Promise<AgricultureResult>>();

/** Forget every cached answer (tests). */
export function clearAgricultureCache() {
  cache.clear();
  inflight.clear();
}

/**
 * Farm weather for a place and the user's farming crops. One request per
 * place and crop list at a time, and a ready answer is reused for
 * `AGRICULTURE_TTL_MS`, so opening the insights page from the card does not
 * ask again. `fresh` skips the reuse (pull to refresh). An unavailable answer
 * or a failure is never reused, so "Try again" always asks.
 */
export async function fetchAgriculture(
  location: AgriLocationRef,
  crops: readonly string[],
  signal?: AbortSignal,
  opts: { fresh?: boolean; now?: number } = {},
): Promise<AgricultureResult> {
  const query = agricultureQuery(location, crops);
  const key = JSON.stringify(query);
  const now = opts.now ?? Date.now();
  const hit = cache.get(key);
  if (!opts.fresh && hit && now - hit.at <= AGRICULTURE_TTL_MS) {
    return hit.result;
  }
  const running = opts.fresh ? undefined : inflight.get(key);
  const request =
    running ??
    apiFetch<unknown>(ROUTES.agriculture, { query, signal })
      .then(readAgriculture)
      .then((result) => {
        if (result.kind === "ready") cache.set(key, { result, at: now });
        return result;
      })
      .finally(() => {
        if (inflight.get(key) === request) inflight.delete(key);
      });
  if (!running) inflight.set(key, request);
  return request;
}
