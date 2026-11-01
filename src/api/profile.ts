/**
 * A place's knowledge from the weather Worker: `GET /v1/locations/profile`
 * (mukoko-dev/mukoko-weather#277). The season now and next, the climate zone,
 * this month's normals and the crop calendar.
 *
 * The profile changes slowly and several cards read it (the season line, the
 * About card), so an answer is kept for 30 minutes per place and concurrent
 * requests share one fetch. The shared request is never tied to one caller's
 * abort signal (a card unmounting must not cancel it for the next one);
 * callers ignore a result they no longer want instead.
 */

import { ApiError, apiFetch, ROUTES } from "@/api/client";
import { type PlaceProfile } from "@/shared/place-knowledge";

export const PLACE_PROFILE_TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 50;

export interface ProfileRef {
  /** The place's slug; a bare coordinate is asked by point alone. */
  slug?: string;
  lat?: number;
  lon?: number;
  /** ISO 3166-1 alpha-2, when the place knows it. */
  country?: string;
}

/** The slug first; the coordinates let the Worker place a spot it cannot resolve by name. */
export function profileQuery(ref: ProfileRef): Record<string, string> {
  const query: Record<string, string> = {};
  if (ref.slug) query.slug = ref.slug;
  if (typeof ref.lat === "number" && typeof ref.lon === "number") {
    query.lat = ref.lat.toFixed(4);
    query.lon = ref.lon.toFixed(4);
  }
  if (ref.country && /^[A-Za-z]{2}$/.test(ref.country)) {
    query.country = ref.country;
  }
  return query;
}

/** The cache key: the slug, else the point to about a kilometre. */
export function profileKey(ref: ProfileRef): string {
  if (ref.slug) return ref.slug;
  const part = (n?: number) => (typeof n === "number" ? n.toFixed(2) : "?");
  return `@${part(ref.lat)},${part(ref.lon)}`;
}

const cache = new Map<string, { profile: PlaceProfile; at: number }>();
const inflight = new Map<string, Promise<PlaceProfile>>();

/** The cached profile for a key (`profileKey`), or undefined when absent or stale. */
export function peekPlaceProfile(
  slug: string,
  now: number = Date.now(),
): PlaceProfile | undefined {
  const hit = cache.get(slug);
  if (!hit) return undefined;
  if (now - hit.at > PLACE_PROFILE_TTL_MS) {
    cache.delete(slug);
    return undefined;
  }
  return hit.profile;
}

/**
 * Fetch once (deduplicated) and cache. Rejects on a failed request and on a
 * body that is not a profile, so callers show nothing rather than half a row.
 */
export function fetchPlaceProfile(ref: ProfileRef): Promise<PlaceProfile> {
  const key = profileKey(ref);
  const cached = peekPlaceProfile(key);
  if (cached) return Promise.resolve(cached);
  const pending = inflight.get(key);
  if (pending) return pending;
  const request = apiFetch<unknown>(ROUTES.profile, {
    query: profileQuery(ref),
  })
    .then((body) => {
      const json = body as PlaceProfile | null;
      if (!json || typeof json !== "object" || !json.current) {
        throw new ApiError(
          "That place's profile could not be read.",
          502,
          ROUTES.profile,
        );
      }
      if (cache.size >= MAX_ENTRIES) cache.clear();
      cache.set(key, { profile: json, at: Date.now() });
      return json;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, request);
  return request;
}

/** Test hook. */
export function resetPlaceProfileCache(): void {
  cache.clear();
  inflight.clear();
}
