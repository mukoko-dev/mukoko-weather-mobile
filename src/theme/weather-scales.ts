/**
 * Weather DATA colours for the cards and charts: a colour that encodes a
 * measured value follows the convention weather users expect worldwide, never
 * a brand mineral (owner rule, 2026-10-31; mukoko-weather
 * `src/lib/weather-scales.ts` and the `--wx-*` tokens in `globals.css`). The
 * web is the design: change a value there first, then here.
 *
 *  - AQI: the six official US EPA AirNow colours. They cannot all be 3:1
 *    against a card, so every swatch carries `PageColors.outline`.
 *  - Frost: three blues, advisory to severe, retuned per theme so each border
 *    holds 3:1 on the card.
 *  - Series: one colour per measured quantity in a chart (`--wx-series-*`).
 *  - Model lines: a model is an identity, not a measured value, so its line
 *    takes a categorical mineral (`--chart-*`), as on the web.
 *
 * Colour is never the only signal: bands carry names and ranges, a chart has a
 * spoken summary and a legend with words.
 */

import { type ColorSchemeName } from "react-native";

import { type AqiBand, AQI_BANDS } from "@/shared/aqi";
import {
  type SeriesKey,
  WX_SERIES_DARK,
  WX_SERIES_LIGHT,
  seriesColors,
} from "./wx-series";

/** US EPA AQI band fills (`--wx-aqi-1..6`), identical in light and dark. */
export const WX_AQI = [
  "#00e400",
  "#ffff00",
  "#ff7e00",
  "#ff0000",
  "#8f3f97",
  "#7e0023",
] as const;

/** The fill for an AQI band. */
export function aqiFill(band: AqiBand): string {
  return WX_AQI[AQI_BANDS.indexOf(band)];
}

/** Frost banner blues (`--wx-frost-1..3`): moderate, high, severe. */
export const WX_FROST = {
  light: ["#4292c6", "#2171b5", "#08306b"],
  dark: ["#9ecae1", "#4292c6", "#2171b5"],
} as const;

export type FrostRisk = "moderate" | "high" | "severe";

export function frostColor(risk: FrostRisk, scheme: ColorSchemeName): string {
  const idx = risk === "moderate" ? 0 : risk === "high" ? 1 : 2;
  return WX_FROST[scheme === "dark" ? "dark" : "light"][idx];
}

/**
 * Chart series colours (`--wx-series-*`): ONE table, in src/theme/wx-series.ts,
 * which the chart itself reads. These are views of it by colour scheme.
 */
export type { SeriesKey };

export const WX_SERIES: Record<"light" | "dark", Record<SeriesKey, string>> = {
  light: WX_SERIES_LIGHT,
  dark: WX_SERIES_DARK,
};

export function seriesColor(key: SeriesKey, scheme: ColorSchemeName): string {
  return seriesColors(scheme === "dark")[key];
}

/** `--chart-1..6`, the categorical mineral lines (model comparison). */
export const WX_MODEL_LINES = {
  light: ["#4b0082", "#0047ab", "#2d6a4f", "#b8860b", "#c1440e", "#283593"],
  dark: ["#b388ff", "#00b0ff", "#64ffda", "#ffd740", "#d4a574", "#3d5afe"],
} as const;

/**
 * The line colour of a comparison model, by the web's `MODEL_COLORS`: ECMWF
 * chart-1, AIFS chart-6, GFS chart-2, ICON chart-3, Météo-France chart-4 and
 * the blend or anything else chart-5. The lines are told apart by their legend
 * words as well as their colour.
 */
const MODEL_LINE_INDEX: Record<string, number> = {
  ecmwf_ifs: 0,
  ecmwf_aifs025_single: 5,
  gfs_seamless: 1,
  icon_global: 2,
  meteofrance_seamless: 3,
  best_match: 4,
};
const FALLBACK_LINE_INDEX = 4;

export function modelLineColor(model: string, scheme: ColorSchemeName): string {
  const set = WX_MODEL_LINES[scheme === "dark" ? "dark" : "light"];
  return set[MODEL_LINE_INDEX[model] ?? FALLBACK_LINE_INDEX];
}
