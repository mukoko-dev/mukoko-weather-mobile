/**
 * Shamwari's weather summary and its follow-up, from the AI Worker through the
 * public API:
 *
 *   POST /v1/ai/summary   { location: { lat, lon, name, country?, elevation?, slug? } }
 *                          -> { insight, cached, generatedAt }
 *   POST /v1/ai/followup  { message, locationName, locationSlug, weatherSummary,
 *                           season?, history }
 *                          -> { response, error? }
 *
 * On the web both are for signed-in people only (the web's `/api/ai` proxy
 * checks the session before it forwards). The app's sign-in is switched off
 * (`SIGN_IN_AVAILABLE` in `src/api/auth.ts`: there is no token exchange route),
 * so the screens do not call these until it is on; they show the designed
 * signed-out state instead (`src/components/weather/AiSummary.tsx`).
 *
 * The Worker answers anonymous callers too, with only a per-address rate
 * limit; the app does not use that as a way around the web's rule.
 *
 * Privacy: the summary body carries the place and nothing about the person.
 * The activities a person picked are NOT sent (the web sends their ids so the
 * advice can mention them): the owner's rule for slice (c) is that the
 * selection stays on the device. The Worker fetches the weather itself, so no
 * forecast is sent either.
 */

import { ApiError, apiFetch, ROUTES } from "@/api/client";

/** The follow-up allows this many messages, then points to the Shamwari tab. */
export const MAX_FOLLOWUP_MESSAGES = 5;
/** The Worker rejects a longer message or history entry. */
export const MAX_FOLLOWUP_LEN = 2000;

export type SummaryPlace = {
  slug?: string;
  name: string;
  lat: number;
  lon: number;
  country?: string;
  elevation?: number | null;
};

export type AiSummary = {
  insight: string;
  cached: boolean;
  generatedAt?: string;
};

/** The body of `POST /v1/ai/summary` (pure, so the privacy rule is testable). */
export function summaryBody(place: SummaryPlace) {
  const location: Record<string, unknown> = {
    name: place.name,
    lat: place.lat,
    lon: place.lon,
  };
  if (place.slug) location.slug = place.slug;
  if (place.country) location.country = place.country;
  if (typeof place.elevation === "number") {
    location.elevation = place.elevation;
  }
  return { location };
}

export async function fetchAiSummary(
  place: SummaryPlace,
  signal?: AbortSignal,
): Promise<AiSummary> {
  const data = await apiFetch<{
    insight?: unknown;
    cached?: unknown;
    generatedAt?: unknown;
  }>(ROUTES.aiSummary, { method: "POST", json: summaryBody(place), signal });
  const insight = typeof data?.insight === "string" ? data.insight.trim() : "";
  if (!insight) throw new Error("The summary was empty.");
  return {
    insight,
    cached: data.cached === true,
    generatedAt:
      typeof data.generatedAt === "string" ? data.generatedAt : undefined,
  };
}

export type FollowupTurn = { role: "user" | "assistant"; content: string };

export type FollowupInput = {
  message: string;
  locationName: string;
  locationSlug: string;
  weatherSummary: string;
  season?: string;
  history: FollowupTurn[];
};

/** The body of `POST /v1/ai/followup`: capped, and with no activities. */
export function followupBody(input: FollowupInput) {
  return {
    message: input.message.trim().slice(0, MAX_FOLLOWUP_LEN),
    locationName: input.locationName,
    locationSlug: input.locationSlug,
    weatherSummary: input.weatherSummary.slice(0, MAX_FOLLOWUP_LEN),
    season: input.season ?? "",
    history: input.history.slice(-MAX_FOLLOWUP_MESSAGES * 2).map((t) => ({
      role: t.role,
      content: t.content.slice(0, MAX_FOLLOWUP_LEN),
    })),
  };
}

export type FollowupReply = { response: string; failed: boolean };

const TROUBLE =
  "Sorry, I couldn't process that. The weather above is still available.";
const LIMITED =
  "Shamwari has reached its limit for now. Please try again a little later.";

/**
 * Ask a follow-up. Never throws for a network or API failure: a failure comes
 * back as a reply the transcript can show (`failed: true`), as the web does.
 * An abort is rethrown so a cancelled ask is not shown as an answer.
 */
export async function sendFollowup(
  input: FollowupInput,
  signal?: AbortSignal,
): Promise<FollowupReply> {
  try {
    const data = await apiFetch<{ response?: unknown; error?: unknown }>(
      ROUTES.aiFollowup,
      { method: "POST", json: followupBody(input), signal },
    );
    const text = typeof data?.response === "string" ? data.response.trim() : "";
    if (!text) return { response: TROUBLE, failed: true };
    return { response: text, failed: data.error === true };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    if (err instanceof ApiError && err.status === 429) {
      return { response: LIMITED, failed: true };
    }
    return { response: TROUBLE, failed: true };
  }
}
