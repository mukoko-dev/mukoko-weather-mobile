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

/** Chart series colours (`--wx-series-*`). */
export type SeriesKey =
  | "temp"
  | "tempLow"
  | "feels"
  | "rain"
  | "rainProb"
  | "wind"
  | "gust"
  | "cloud"
  | "humidity"
  | "pressure"
  | "dew"
  | "visibility";

export const WX_SERIES: Record<"light" | "dark", Record<SeriesKey, string>> = {
  light: {
    temp: "#d73027",
    tempLow: "#4575b4",
    feels: "#b8570b",
    rain: "#0b6fb8",
    rainProb: "#08519c",
    wind: "#2a9d8f",
    gust: "#1b6a5f",
    cloud: "#6b7280",
    humidity: "#238b45",
    pressure: "#6a51a3",
    dew: "#0e7490",
    visibility: "#525252",
  },
  dark: {
    temp: "#f4806f",
    tempLow: "#74add1",
    feels: "#fdae61",
    rain: "#4fc3f7",
    rainProb: "#9ecae1",
    wind: "#5fd3c4",
    gust: "#8fe0d3",
    cloud: "#a1a1aa",
    humidity: "#74c476",
    pressure: "#b2a3e0",
    dew: "#67d1e6",
    visibility: "#a3a3a3",
  },
};

export function seriesColor(key: SeriesKey, scheme: ColorSchemeName): string {
  return WX_SERIES[scheme === "dark" ? "dark" : "light"][key];
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

export function modelLineColor(
  model: string,
  scheme: ColorSchemeName,
): string {
  const set = WX_MODEL_LINES[scheme === "dark" ? "dark" : "light"];
  return set[MODEL_LINE_INDEX[model] ?? FALLBACK_LINE_INDEX];
}
