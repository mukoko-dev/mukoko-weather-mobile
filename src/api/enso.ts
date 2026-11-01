/**
 * The El Niño / La Niña phase from the weather Worker: `GET /v1/enso`
 * (NOAA CPC's Oceanic Niño Index, cached by the Worker for 12 hours).
 *
 * The Worker answers HTTP 200 with `available: false` when NOAA cannot be
 * reached; that is a value (`kind: "unavailable"`), and the card says so. A
 * thrown error means the request itself failed.
 */

import { ApiError, apiFetch, ROUTES } from "@/api/client";
import {
  type EnsoOutlookResponse,
  type ReadyOutlook,
  readyOutlook,
} from "@/shared/enso";

export type EnsoResult =
  | { kind: "ready"; data: ReadyOutlook }
  | { kind: "unavailable" };

/** Read the answer; a body that is not an object is a failed request. */
export function readEnso(raw: unknown): EnsoResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ApiError("The outlook could not be read.", 502, ROUTES.enso);
  }
  const ready = readyOutlook(raw as EnsoOutlookResponse);
  return ready ? { kind: "ready", data: ready } : { kind: "unavailable" };
}

export async function fetchEnso(signal?: AbortSignal): Promise<EnsoResult> {
  return readEnso(await apiFetch<unknown>(ROUTES.enso, { signal }));
}
