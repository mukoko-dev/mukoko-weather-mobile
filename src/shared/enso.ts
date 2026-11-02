/**
 * ENSO (El Niño–Southern Oscillation) helpers: pure, no DOM or fetch.
 *
 * Ported unchanged from mukoko-weather `src/lib/enso.ts`, with the web's own
 * test vectors (src/shared/enso.test.ts). Add the card's response type and
 * labels below the port, not inside it.
 *
 * `ensoImpact` turns the global ENSO phase into 1–3 plain-language lines for
 * the location's region. The climatology is well established but regional and
 * seasonal, so every line is hedged ("tends to", "often") and none promises a
 * particular outcome.
 *
 * Region rules, checked in order:
 *   1. Southeast Asia (by country code)
 *   2. East Africa (by country code)
 *   3. Southern Africa (by country code, from an explicit list)
 *   4. Only when the country code is missing: a point south of 8°S inside
 *      Africa's rough longitude bounds (-20 to 55) is treated as southern
 *      Africa. Latitude is never used as a fallback for a known country, so
 *      Australia, Peru and Papua New Guinea get the generic line.
 *   5. Everything else gets a generic line.
 */

export type EnsoPhase = "El Niño" | "La Niña" | "Neutral";

const SOUTHERN_AFRICA = new Set([
  "ZW",
  "ZA",
  "ZM",
  "MZ",
  "MW",
  "BW",
  "NA",
  "LS",
  "SZ",
  "AO",
  "MG",
]);

const EAST_AFRICA = new Set(["KE", "TZ", "UG", "ET", "RW", "BI", "SO"]);

const SOUTHEAST_ASIA = new Set([
  "SG",
  "MY",
  "ID",
  "TH",
  "PH",
  "VN",
  "BN",
  "KH",
  "LA",
  "MM",
]);

/** Latitude south of which the southern-Africa tiebreak applies (degrees). */
export const SOUTHERN_TROPICS_LAT = -8;

/** Rough longitude bounds of the African continent (degrees, WGS 84). */
export const AFRICA_LON_MIN = -20;
export const AFRICA_LON_MAX = 55;

type Region = "southern-africa" | "east-africa" | "southeast-asia" | "other";

export function ensoRegion(
  countryCode: string | undefined,
  lat: number,
  lon: number,
): Region {
  const cc = countryCode?.toUpperCase();
  if (cc) {
    if (SOUTHEAST_ASIA.has(cc)) return "southeast-asia";
    if (EAST_AFRICA.has(cc)) return "east-africa";
    if (SOUTHERN_AFRICA.has(cc)) return "southern-africa";
    // A known country that is not in a list is generic, whatever its latitude.
    return "other";
  }
  // No country code: use the position as a tiebreak, but only inside Africa.
  const inAfricaBounds =
    Number.isFinite(lon) && lon >= AFRICA_LON_MIN && lon <= AFRICA_LON_MAX;
  if (inAfricaBounds && Number.isFinite(lat) && lat < SOUTHERN_TROPICS_LAT) {
    return "southern-africa";
  }
  return "other";
}

const IMPACTS: Record<EnsoPhase, Record<Region, string[]>> = {
  "El Niño": {
    "southern-africa": [
      "El Niño tends to bring a drier, hotter rainy season to southern Africa.",
      "Plan for drought-tolerant seed and staggered planting.",
      "Prioritise water harvesting and storage for dry spells.",
    ],
    "east-africa": [
      "El Niño is often linked to wetter short rains (October to December) in East Africa.",
      "Watch for flooding and landslide risk in low-lying and steep areas.",
    ],
    "southeast-asia": [
      "El Niño tends to bring drier conditions to Southeast Asia.",
      "Dry spells raise the risk of haze and vegetation fires; check air quality daily.",
    ],
    other: [
      "El Niño can shift rainfall and temperature patterns in many regions; effects vary locally.",
    ],
  },
  "La Niña": {
    "southern-africa": [
      "La Niña tends to bring wetter conditions to southern Africa's rainy season.",
      "Watch for flood risk in low-lying areas and waterlogged fields.",
      "Wet conditions favour crop disease; scout fields regularly.",
    ],
    "east-africa": [
      "La Niña is often linked to drier short rains (October to December) in East Africa.",
      "Plan water supply and livestock feed for a possible dry spell.",
    ],
    "southeast-asia": [
      "La Niña tends to bring wetter conditions to much of Southeast Asia.",
      "Watch for flooding, especially in river catchments.",
    ],
    other: [
      "La Niña can shift rainfall and temperature patterns in many regions; effects vary locally.",
    ],
  },
  Neutral: {
    "southern-africa": [
      "No strong ENSO signal right now, so seasonal outlooks rely on other drivers.",
    ],
    "east-africa": [
      "No strong ENSO signal right now, so seasonal outlooks rely on other drivers.",
    ],
    "southeast-asia": [
      "No strong ENSO signal right now, so seasonal outlooks rely on other drivers.",
    ],
    other: [
      "No strong ENSO signal right now, so seasonal outlooks rely on other drivers.",
    ],
  },
};

/**
 * Plain-language impact lines (1–3) for a location, given the global ENSO
 * phase. Returns copies, so callers may mutate the result safely.
 */
export function ensoImpact(
  phase: EnsoPhase,
  countryCode: string | undefined,
  lat: number,
  lon: number,
): string[] {
  const region = ensoRegion(countryCode, lat, lon);
  return [...IMPACTS[phase][region]];
}

// ---------------------------------------------------------------------------
// The card (mobile): `GET /v1/enso` answer and the words around it
// ---------------------------------------------------------------------------

export interface EnsoSeason {
  season: string;
  year: number;
  oni: number;
}

export type EnsoStrength = "weak" | "moderate" | "strong" | "very strong";

/** The Worker's `GET /v1/enso` answer (NOAA CPC Oceanic Niño Index). */
export interface EnsoOutlookResponse {
  available: boolean;
  season: string | null;
  year: number | null;
  oni: number | null;
  phase: EnsoPhase | null;
  strength: EnsoStrength | null;
  series: EnsoSeason[];
  source: string;
  fetchedAt: string | null;
}

/** An available outlook with every field the card renders guaranteed non-null. */
export type ReadyOutlook = EnsoOutlookResponse & {
  phase: EnsoPhase;
  oni: number;
  season: string;
  year: number;
};

/** Strength is shown as an outline label, not a colour, so it doesn't compete with phase. */
export const ENSO_STRENGTH_LABEL: Record<EnsoStrength, string> = {
  weak: "Weak",
  moderate: "Moderate",
  strong: "Strong",
  "very strong": "Very strong",
};

/** Signed ONI with two decimals, e.g. "+2.16" or "−0.43". */
export function formatOni(oni: number): string {
  const sign = oni < 0 ? "−" : "+";
  return `${sign}${Math.abs(oni).toFixed(2)}`;
}

const PHASES: readonly EnsoPhase[] = ["El Niño", "La Niña", "Neutral"];

/**
 * The outlook when the Worker has a full reading, else null. The Worker
 * answers HTTP 200 with `available: false` when NOAA is out of reach; a
 * reading with a missing field is never filled in.
 */
export function readyOutlook(
  data: EnsoOutlookResponse | null | undefined,
): ReadyOutlook | null {
  if (
    !data?.available ||
    !data.phase ||
    !PHASES.includes(data.phase) ||
    typeof data.oni !== "number" ||
    !Number.isFinite(data.oni) ||
    typeof data.season !== "string" ||
    typeof data.year !== "number"
  ) {
    return null;
  }
  return {
    ...data,
    phase: data.phase,
    oni: data.oni,
    season: data.season,
    year: data.year,
    series: Array.isArray(data.series) ? data.series : [],
  };
}
