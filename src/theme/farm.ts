/**
 * The colours the agriculture and place cards use beyond the page tokens in
 * `mzizi.ts`, mirrored from the web (`--color-severity-*`, `--mineral-*`,
 * `--chart-*`, `--wx-series-rain`, `--wx-temp-1/9`, `--color-surface-dim` in
 * mukoko-weather `src/app/globals.css`). The web is the design: when a value
 * changes there, change it here in the same pull request.
 *
 * Two kinds of colour live here, and they are kept apart on purpose:
 *   - UI chrome: the malachite agriculture accent (a card's border, a stage
 *     in the crop calendar) and the surface behind a small tile.
 *   - Value colours: a window's Go / Wait / Hold off tone and a risk's level
 *     follow the severity convention (low is safe, moderate is mild, severe is
 *     stop), never a brand mineral. The ENSO phase badge follows the
 *     temperature convention (warm red for El Niño, cool blue for La Niña).
 * A value colour is always printed with a word beside it, so colour is never
 * the only signal.
 */

import { type ColorSchemeName } from "react-native";

import { type SeverityTone } from "@/shared/agriculture";

export type FarmColors = {
  /** `--color-severity-low|moderate|severe`: text and dots on a card. */
  severity: Record<SeverityTone, string>;
  /** `--color-severity-fg`: text ON a solid severity fill. */
  severityFg: string;
  /** `--color-primary-foreground`: text on a filled primary button. */
  onPrimary: string;
  /** `--color-surface-dim`: the small inset tile inside a card. */
  surfaceDim: string;
  /** `--mineral-malachite` and the text that sits on it. */
  malachite: string;
  malachiteFg: string;
  /** `--mineral-gold` and the text that sits on it (the harvest stage). */
  gold: string;
  goldFg: string;
  /** Chart series: `--wx-series-rain`, terracotta, and `--chart-2|4|5|6`. */
  series: {
    rain: string;
    terracotta: string;
    cobalt: string;
    sodalite: string;
    gold: string;
    earth: string;
  };
  /** ENSO phase badge fills (`--wx-temp-9`, `--wx-temp-1`) and their text. */
  ensoWarm: string;
  ensoCool: string;
  ensoFg: string;
};

export const FARM_LIGHT: FarmColors = {
  severity: { low: "#004d40", moderate: "#5d4037", severe: "#b3261e" },
  severityFg: "#ffffff",
  onPrimary: "#ffffff",
  surfaceDim: "#f3f2ee",
  malachite: "#004d40",
  malachiteFg: "#ffffff",
  gold: "#5d4037",
  goldFg: "#ffffff",
  series: {
    rain: "#0b6fb8",
    terracotta: "#a0522d",
    cobalt: "#0047ab",
    sodalite: "#283593",
    gold: "#b8860b",
    earth: "#c1440e",
  },
  ensoWarm: "#d73027",
  ensoCool: "#4575b4",
  ensoFg: "#ffffff",
};

export const FARM_DARK: FarmColors = {
  severity: { low: "#64ffda", moderate: "#ffd740", severe: "#ff5252" },
  severityFg: "#0a0a0a",
  onPrimary: "#0a0a0a",
  surfaceDim: "#141414",
  malachite: "#64ffda",
  malachiteFg: "#0a0a0a",
  gold: "#ffd740",
  goldFg: "#0a0a0a",
  series: {
    rain: "#4fc3f7",
    terracotta: "#e1b07e",
    cobalt: "#00b0ff",
    sodalite: "#3d5afe",
    gold: "#ffd740",
    earth: "#d4a574",
  },
  ensoWarm: "#d73027",
  ensoCool: "#4575b4",
  ensoFg: "#ffffff",
};

export function farmColorsFor(scheme: ColorSchemeName): FarmColors {
  return scheme === "dark" ? FARM_DARK : FARM_LIGHT;
}

/** Sizes the agriculture and place cards draw, in dp. */
export const FARM_SIZE = {
  /** The status dot beside a window's title (`h-2 w-2`). */
  dot: 8,
  /** A crop-calendar month cell, and the legend swatch beside a stage name. */
  calendarCell: 24,
  swatchWidth: 20,
  swatchHeight: 12,
  /** A chart: plot height, the y-axis label column, and the legend swatch. */
  chartHeight: 176,
  chartAxis: 44,
  legendSwatch: 12,
  /** The line and bar widths in a chart. */
  chartLine: 2,
  /** The gap a bar leaves beside its neighbour, as a share of its slot. */
  barGap: 0.3,
} as const;
