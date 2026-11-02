/**
 * Why a request failed, in words that follow the cause (issue #74).
 *
 * The Worker already says which side failed, so the screens must not guess:
 *
 * - `offline`: nothing answered (no network, refused). Only this one asks the
 *   person to check their connection.
 * - `timeout`: nothing answered in time (a stalled 2G link, a captive portal).
 * - `provider`: the Worker answered, but the forecast source behind it did not
 *   (a 5xx, `X-Weather-Provider: fallback`, `reason: provider_error`). Nothing
 *   on the person's side is wrong.
 * - `not_found`: the Worker does not know the place.
 * - `rate_limited`: too many requests from this device for now.
 * - `unknown`: anything else. Says nothing it cannot know.
 *
 * Never shows the error's own message: that is developer text
 * ("fetch failed: Could not connect to the server.").
 */

import { ApiError, NetworkError } from "@/api/client";

export type FailureKind =
  | "offline"
  | "timeout"
  | "provider"
  | "not_found"
  | "rate_limited"
  | "unknown";

/**
 * The Worker reached its forecast source and got nothing usable back, so it
 * sent the seasonal estimate (`X-Weather-Provider: fallback`). Thrown where the
 * estimate must not be drawn as a forecast.
 */
export class ProviderFallbackError extends Error {
  constructor() {
    super("The forecast source sent the seasonal estimate.");
    this.name = "ProviderFallbackError";
  }
}

export function failureKind(err: unknown): FailureKind {
  if (err instanceof NetworkError) return err.kind;
  if (err instanceof ProviderFallbackError) return "provider";
  if (err instanceof ApiError) {
    if (err.status === 404) return "not_found";
    if (err.status === 429) return "rate_limited";
    if (err.status >= 500) return "provider";
    return "unknown";
  }
  return "unknown";
}

/** What happened and what to do, one or two sentences, for a screen. */
export const FAILURE_COPY: Record<FailureKind, string> = {
  offline:
    "Mukoko could not be reached. Check your connection, then try again.",
  timeout:
    "The weather service is taking too long to answer. Try again in a moment.",
  provider: "Our weather source isn't answering right now. Try again shortly.",
  not_found: "We don't know this place.",
  rate_limited:
    "Too many requests from this device just now. Try again in a minute.",
  unknown: "Something went wrong on the way. Try again in a moment.",
};

/** The sentence for an error, by its cause. */
export function failureMessage(err: unknown): string {
  return FAILURE_COPY[failureKind(err)];
}
