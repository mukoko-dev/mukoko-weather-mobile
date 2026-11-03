/**
 * The place a weather page is showing, in the shape the farm and place cards
 * take. The page reads it from the converted weather answer (a place's slug
 * route carries the whole place; a GPS fix carries what the geo lookup named,
 * or just the point). Nothing here reads the network.
 */

import { type LocationSummary } from "@/api/locations";
import { type WeatherResponse } from "@/api/weather";
import { type PlaceInfo } from "@/shared/place-info";

/** A named place from the API, as the cards take it. */
export function placeOfSummary(place: LocationSummary): PlaceInfo {
  return {
    slug: place.slug,
    name: place.name,
    lat: place.lat,
    lon: place.lon,
    country: place.country,
    province: place.province,
    elevation: place.elevation,
    source: place.source,
    address: place.address,
  };
}

/**
 * The place under a weather answer, or null when the answer does not say where
 * it is (then the place cards are left out, never aimed at a guessed point).
 * `name` is what the page shows as the place's name.
 */
export function placeOf(
  weather: WeatherResponse,
  name: string,
): PlaceInfo | null {
  const l = weather.location;
  if (!l || !Number.isFinite(l.lat) || !Number.isFinite(l.lon)) return null;
  return {
    slug: l.slug,
    name,
    lat: l.lat,
    lon: l.lon,
    country: l.country,
    province: l.province,
    elevation: l.elevation,
    source: l.source,
    address: l.address,
  };
}

/**
 * A weather answer for a GPS fix with the place the fix was named as. The
 * answer itself only knows the point, so the farm and place cards would have
 * nothing to ask about; this puts the point (and the named place, when the geo
 * lookup has come back) on it. An answer that already carries a place is left
 * as it is.
 */
export function withPlace(
  weather: WeatherResponse,
  point: { lat: number; lon: number },
  place?: LocationSummary | null,
): WeatherResponse {
  if (weather.location) return weather;
  return {
    ...weather,
    location: place
      ? {
          slug: place.slug,
          name: place.name,
          province: place.province,
          country: place.country,
          lat: place.lat,
          lon: place.lon,
          elevation: place.elevation,
          source: place.source,
          address: place.address,
        }
      : { lat: point.lat, lon: point.lon },
  };
}

/**
 * The weather answer as the Weather tab draws it. The farm and place cards ask
 * the Worker about the place under the page, so they must not start from the
 * bare GPS point and then start again once the geo lookup names it (two farm
 * payloads and two profile requests at every cold start, and a season line that
 * changes after first paint). Until the lookup has settled, the answer is
 * passed through as it is: it carries no place, so those cards are left out.
 * Once it has settled, with a name or without one, they are drawn for the place
 * the lookup found or, failing that, the point.
 */
export function weatherForPage(
  weather: WeatherResponse,
  fix: {
    lat: number;
    lon: number;
    place?: LocationSummary | null;
    /** True once the geo lookup has answered, or has failed. */
    settled?: boolean;
  } | null,
): WeatherResponse {
  if (!fix?.settled) return weather;
  return withPlace(weather, fix, fix.place);
}

/** Harare, Mukoko's editorial default, used when there is no location fix. */
export const HARARE_DEFAULT = {
  lat: -17.8252,
  lon: 31.0335,
  label: "Harare",
  slug: "harare",
  country: "ZW",
};

/** How long the place cards wait for the place to be named. */
export const PLACE_LOOKUP_TIMEOUT_MS = 8_000;

/**
 * The place for the Harare default: the lookup's answer only when it IS
 * Harare (find-only can return a nearby stored spot), else Harare as the app
 * knows it. The default never takes another place's name or links.
 */
export function fallbackPlace(found: LocationSummary | null): LocationSummary {
  if (found?.slug === HARARE_DEFAULT.slug) return found;
  return {
    slug: HARARE_DEFAULT.slug,
    name: HARARE_DEFAULT.label,
    country: HARARE_DEFAULT.country,
    lat: HARARE_DEFAULT.lat,
    lon: HARARE_DEFAULT.lon,
  };
}
