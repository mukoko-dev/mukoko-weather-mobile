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
    throw new ApiError("The farm data could not be read.", 502, ROUTES.agriculture);
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

/** Farm weather for a place and the user's farming crops. */
export async function fetchAgriculture(
  location: AgriLocationRef,
  crops: readonly string[],
  signal?: AbortSignal,
): Promise<AgricultureResult> {
  return readAgriculture(
    await apiFetch<unknown>(ROUTES.agriculture, {
      query: agricultureQuery(location, crops),
      signal,
    }),
  );
}
