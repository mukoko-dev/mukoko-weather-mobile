/**
 * Place endpoints of the weather Worker:
 *   GET /v1/locations?slug=        one place
 *   GET /v1/search?q=              places matching a name
 *   GET /v1/geo?lat=&lon=[&autoCreate=true]   the place for a coordinate
 *
 * The Worker answers with its own `LocationDoc` shape (`locations` arrays,
 * `nearest`). It is converted to `LocationSummary` here, at the edge, so the
 * screens never see the wire format.
 *
 * The app cannot create a place. `geo` with `autoCreate=true` names the exact
 * spot under the caller's GPS fix and answers a `{name}--{geohash}` slug that
 * renders without any record; nothing is stored. Creating a canonical place
 * belongs to the Nyuchi API, not to a Worker and not to this app.
 */

import { ApiError, apiFetch, ROUTES } from "@/api/client";

export type LocationSummary = {
  slug: string;
  name: string;
  province?: string;
  /** ISO 3166-1 alpha-2 code. */
  country?: string;
  lat: number;
  lon: number;
  elevation?: number;
  tags?: string[];
  /** `seed`, `places`, `geocoded` or `geolocation`. */
  source?: string;
  /** Set when the answer names an area (a country or region), not a place. */
  area?: string;
};

export type SearchResponse = {
  results: LocationSummary[];
  total?: number;
};

/** A place as the Worker sends it. Everything is read defensively. */
type WireLocation = {
  slug?: unknown;
  name?: unknown;
  province?: unknown;
  country?: unknown;
  lat?: unknown;
  lon?: unknown;
  elevation?: unknown;
  tags?: unknown;
  source?: unknown;
  area?: unknown;
};

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function finite(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** A place with a slug, a name and a coordinate; anything else is dropped. */
export function toLocationSummary(raw: unknown): LocationSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const w = raw as WireLocation;
  const slug = str(w.slug);
  const name = str(w.name);
  const lat = finite(w.lat);
  const lon = finite(w.lon);
  if (!slug || !name || lat === undefined || lon === undefined) return null;
  return {
    slug,
    name,
    province: str(w.province),
    country: str(w.country),
    lat,
    lon,
    elevation: finite(w.elevation),
    tags: Array.isArray(w.tags)
      ? w.tags.filter((t): t is string => typeof t === "string")
      : undefined,
    source: str(w.source),
    area: str(w.area),
  };
}

export async function fetchLocation(
  slug: string,
  signal?: AbortSignal,
): Promise<LocationSummary> {
  const body = await apiFetch<{ location?: unknown }>(ROUTES.locations, {
    query: { slug },
    signal,
  });
  const location = toLocationSummary(body?.location);
  if (!location) {
    throw new ApiError("That place could not be read.", 502, ROUTES.locations);
  }
  return location;
}

export async function searchLocations(
  query: string,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const body = await apiFetch<{ locations?: unknown; total?: unknown }>(
    ROUTES.search,
    { query: { q: query }, signal },
  );
  const results = Array.isArray(body?.locations)
    ? body.locations
        .map(toLocationSummary)
        .filter((l): l is LocationSummary => l !== null)
    : [];
  return { results, total: finite(body?.total) };
}

export type GeoResult = {
  /** The place for the coordinate, or null when the API knows none. */
  location: LocationSummary | null;
  /** True when the place was only just named for this coordinate. */
  isNew: boolean;
  /** True when the place has no record and is read from its own slug. */
  synthesized: boolean;
};

export async function geoLookup(
  lat: number,
  lon: number,
  autoCreate = false,
  signal?: AbortSignal,
): Promise<GeoResult> {
  try {
    const body = await apiFetch<{
      nearest?: unknown;
      isNew?: unknown;
      synthesized?: unknown;
    }>(ROUTES.geo, {
      query: { lat, lon, autoCreate: autoCreate ? "true" : undefined },
      signal,
    });
    return {
      location: toLocationSummary(body?.nearest),
      isNew: body?.isNew === true,
      synthesized: body?.synthesized === true,
    };
  } catch (err) {
    // No known place near the point is an answer, not a failure.
    if (err instanceof ApiError && err.status === 404) {
      return { location: null, isNew: false, synthesized: false };
    }
    throw err;
  }
}
