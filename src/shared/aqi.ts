/**
 * The US EPA Air Quality Index (0-500): its six bands, their names, and the
 * plain-language advice for each. Ported from mukoko-weather `src/lib/aq-grid.ts`
 * (`aqiBand`, `AQI_BANDS`, `AQI_BAND_LABELS`) and `src/lib/display.ts`
 * (`AQI_ADVICE`), with the web's own test vectors. The band COLOURS are a theme
 * concern and live in src/theme/weather-scales.ts.
 *
 * The index is never mixed with another scale; the advice is general guidance,
 * not medical advice.
 */

/** EPA US AQI categories, lowest to highest severity. */
export type AqiBand =
  | "good"
  | "moderate"
  | "usg"
  | "unhealthy"
  | "very_unhealthy"
  | "hazardous";

export const AQI_BANDS: readonly AqiBand[] = [
  "good",
  "moderate",
  "usg",
  "unhealthy",
  "very_unhealthy",
  "hazardous",
];

export const AQI_BAND_LABELS: Record<AqiBand, string> = {
  good: "Good",
  moderate: "Moderate",
  usg: "Unhealthy for sensitive groups",
  unhealthy: "Unhealthy",
  very_unhealthy: "Very unhealthy",
  hazardous: "Hazardous",
};

/** EPA breakpoints: an integer AQI maps to the first band whose ceiling it does not exceed. */
const BAND_CEILINGS: ReadonlyArray<[number, AqiBand]> = [
  [50, "good"],
  [100, "moderate"],
  [150, "usg"],
  [200, "unhealthy"],
  [300, "very_unhealthy"],
];

/** Classify a US AQI value into its EPA band. Values are rounded to the nearest integer first. */
export function aqiBand(aqi: number): AqiBand {
  const value = Math.round(aqi);
  for (const [ceiling, band] of BAND_CEILINGS) {
    if (value <= ceiling) return band;
  }
  return "hazardous";
}

/** The band's position, 0 (good) to 5 (hazardous). */
export function aqiBandIndex(band: AqiBand): number {
  return AQI_BANDS.indexOf(band);
}

/** The Worker's `level` strings (the web calls the third band `unhealthy_sensitive`). */
export type AqiLevel =
  | "good"
  | "moderate"
  | "unhealthy_sensitive"
  | "unhealthy"
  | "very_unhealthy"
  | "hazardous";

/**
 * Plain-language health advice per EPA AQI band. Short and actionable; the
 * bands from unhealthy upwards name the concrete actions (masks, windows,
 * purifiers).
 */
export const AQI_ADVICE: Record<AqiLevel, string> = {
  good: "Air is clean. A good time to be outside.",
  moderate:
    "Acceptable. Unusually sensitive people should take it easy outdoors.",
  unhealthy_sensitive:
    "Children, older people and anyone with asthma should limit time outdoors.",
  unhealthy:
    "Haze is unhealthy. Keep windows closed and cut outdoor exercise. Wear an N95 mask outside.",
  very_unhealthy:
    "Very unhealthy. Stay indoors, run an air purifier, and wear an N95 mask if you must go out.",
  hazardous:
    "Hazardous. Stay indoors with windows shut. Avoid all outdoor activity.",
};
