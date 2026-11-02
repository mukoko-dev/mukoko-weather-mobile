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
