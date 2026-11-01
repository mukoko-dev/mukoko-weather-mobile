/**
 * What the "About {place}" card says about a place, and the place the farm and
 * profile cards ask the Worker about.
 *
 * The rows are the web's (`WeatherDashboard.tsx`, the Location info card):
 * Country, Province, Elevation, Coordinates, Address, Season; then the place
 * knowledge rows (src/shared/place-knowledge.ts). A row with no value is left
 * out, never filled with a guess.
 */

import { type ResolvedSeason, seasonRowValue } from "./season";

/** The place a weather page is showing. */
export interface PlaceInfo {
  /** The place's slug; a bare coordinate has none. */
  slug?: string;
  name: string;
  lat: number;
  lon: number;
  /** ISO 3166-1 alpha-2. */
  country?: string;
  province?: string;
  /** The place record's height in metres (a placeholder 0 for a spot). */
  elevation?: number;
  /** `seed`, `places`, `geocoded` or `geolocation`. */
  source?: string;
  /** A street address, when the place was named from one. */
  address?: string;
}

/** "17.8300°S, 31.0500°E", the web's `formatCoords`. */
export function formatCoords(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}°${ns}, ${Math.abs(lon).toFixed(4)}°${ew}`;
}

/** Real land spans about -430 m to 8 849 m; Open-Meteo sends -9999 for "no data". */
const MIN_ELEVATION_M = -1000;
const MAX_ELEVATION_M = 9000;

/** A spot named on the phone carries a placeholder height, not a measurement. */
const APPROXIMATE_SOURCES: readonly string[] = ["geolocation", "geocoded"];

function plausible(v: number | null | undefined): v is number {
  return (
    typeof v === "number" &&
    Number.isFinite(v) &&
    v > MIN_ELEVATION_M &&
    v < MAX_ELEVATION_M
  );
}

/**
 * The height to state, in whole metres. A place with a stored height keeps it;
 * a spot (a placeholder 0, or a place named from the phone's own fix) takes the
 * terrain height the forecast used for the exact point (the web's
 * `reconcileElevation`). With neither, nothing is stated.
 */
export function aboutElevation(
  place: Pick<PlaceInfo, "elevation" | "source">,
  forecastElevation: number | null | undefined,
): number | null {
  const stored = place.elevation;
  const approximate =
    stored === undefined ||
    stored === 0 ||
    (place.source !== undefined && APPROXIMATE_SOURCES.includes(place.source));
  if (!approximate && plausible(stored)) return Math.round(stored);
  if (plausible(forecastElevation)) return Math.round(forecastElevation);
  return plausible(stored) && stored !== 0 ? Math.round(stored) : null;
}

export interface AboutRow {
  label: string;
  value: string;
}

export interface AboutInput {
  place: PlaceInfo;
  /** The country's name (from its code), when known. */
  countryName?: string;
  season: ResolvedSeason;
  forecastElevation?: number | null;
}

/** The rows above the place-knowledge rows, in the web's order. */
export function aboutRows({
  place,
  countryName,
  season,
  forecastElevation,
}: AboutInput): AboutRow[] {
  const rows: AboutRow[] = [];
  if (countryName) rows.push({ label: "Country", value: countryName });
  if (place.province) rows.push({ label: "Province", value: place.province });
  const metres = aboutElevation(place, forecastElevation);
  if (metres !== null) rows.push({ label: "Elevation", value: `${metres} m` });
  rows.push({
    label: "Coordinates",
    value: formatCoords(place.lat, place.lon),
  });
  if (place.address) rows.push({ label: "Address", value: place.address });
  rows.push({ label: "Season", value: seasonRowValue(season) });
  return rows;
}
