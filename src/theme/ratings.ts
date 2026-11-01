/**
 * Colours and sizes for the activity and community surfaces, mirrored from the
 * web (mukoko-weather `src/app/globals.css` and the components that use
 * them). Kept beside, not inside, `src/theme/mzizi.ts` so the weather page
 * tokens stay one small file.
 *
 * Two rules from the web decide which colour goes where:
 *
 * - A colour that encodes a VALUE (a rating, a report's severity) follows the
 *   severity scale (`--color-severity-*`), never a brand mineral. A rating
 *   always carries its word too, so colour is never the only signal.
 * - A colour that is UI CHROME (an activity's card border, the picker's
 *   selected tile, a lane bar, a report pin) is the activity category's
 *   mineral (`CATEGORY_MINERAL` / `LANE_MINERAL` in `src/shared/activities.ts`).
 *
 * The values are the web's, light and dark. Nothing here is a new design.
 */

import { type ColorSchemeName } from "react-native";

import { type CategoryMineral, type LaneMineral } from "@/shared/activities";
import { type SuitabilityLevel } from "@/shared/suitability";
import { MINERAL_EDGE, type PageColors } from "@/theme/mzizi";

// ---------------------------------------------------------------------------
// Severity — `--color-severity-*`
// ---------------------------------------------------------------------------

export type SeverityName =
  | "low"
  | "moderate"
  | "high"
  | "severe"
  | "extreme"
  | "cold";

export const SEVERITY: Record<
  "light" | "dark",
  Record<SeverityName, string>
> = {
  light: {
    low: "#004d40",
    moderate: "#5d4037",
    high: "#bf5700",
    severe: "#b3261e",
    extreme: "#7f0000",
    cold: "#0047ab",
  },
  dark: {
    low: "#64ffda",
    moderate: "#ffd740",
    high: "#ff9800",
    severe: "#ff5252",
    extreme: "#ff1744",
    cold: "#42a5f5",
  },
};

/** `--color-severity-fg` and the `--mineral-*-fg`: text ON a filled colour. */
export const ON_FILL = { light: "#ffffff", dark: "#0a0a0a" } as const;

const SEVERITY_NAMES: readonly SeverityName[] = [
  "low",
  "moderate",
  "high",
  "severe",
  "extreme",
  "cold",
];

/**
 * The severity a rating is drawn in. The Worker sends the web's class name
 * (`text-severity-severe`), which is read first; a rule without one falls back
 * to the level: excellent and good are low, fair is moderate, poor is severe.
 */
export function severityOfRating(
  level: SuitabilityLevel,
  colorClass?: string,
): SeverityName {
  const m = /severity-(low|moderate|high|severe|extreme|cold)\b/.exec(
    colorClass ?? "",
  );
  if (m) return m[1] as SeverityName;
  if (level === "excellent" || level === "good") return "low";
  return level === "fair" ? "moderate" : "severe";
}

/** A community report's severity word as a severity (mild is low). */
export function severityOfReport(
  severity: "mild" | "moderate" | "severe",
): SeverityName {
  return severity === "mild" ? "low" : severity;
}

export function severityColor(
  name: SeverityName,
  scheme: ColorSchemeName,
): string {
  return SEVERITY[scheme === "dark" ? "dark" : "light"][name];
}

export function isSeverityName(v: string): v is SeverityName {
  return (SEVERITY_NAMES as readonly string[]).includes(v);
}

/** The tint behind a severity word: the severity colour at 10%, as the web. */
export const SEVERITY_TINT = 0.1;

// ---------------------------------------------------------------------------
// Category minerals
// ---------------------------------------------------------------------------

/**
 * The colour of a category mineral in this scheme. `primary` is the app's
 * primary (the Mzizi storm family), not a mineral, as on the web.
 */
export function mineralColor(
  mineral: CategoryMineral | LaneMineral,
  colors: PageColors,
  scheme: ColorSchemeName,
): string {
  if (mineral === "primary") return colors.primary;
  return MINERAL_EDGE[mineral][scheme === "dark" ? "dark" : "light"];
}

/** Text on a filled mineral (`--mineral-*-fg`), and on `primary`. */
export function onMineral(scheme: ColorSchemeName): string {
  return ON_FILL[scheme === "dark" ? "dark" : "light"];
}

// ---------------------------------------------------------------------------
// The Community lane (`CommunityLane.tsx` on the web)
// ---------------------------------------------------------------------------

/**
 * A lane bar is the category mineral at this opacity AND this fraction of the
 * lane's height, so the rating never depends on colour alone (the web's
 * `LANE_FILL` and `LEVEL_HEIGHT`).
 */
export const LANE_ALPHA: Record<SuitabilityLevel, number> = {
  excellent: 1,
  good: 0.7,
  fair: 0.45,
  poor: 0.25,
};

export const LANE_HEIGHT: Record<SuitabilityLevel, number> = {
  excellent: 1,
  good: 0.75,
  fair: 0.5,
  poor: 0.25,
};

/** The legend swatch heights (`h-5`, `h-4`, `h-3`, `h-2`), in dp. */
export const LEGEND_HEIGHT: Record<SuitabilityLevel, number> = {
  excellent: 20,
  good: 16,
  fair: 12,
  poor: 8,
};

/** A cell with no data stands at a quarter height (`h-1/4 bg-surface-dim`). */
export const NO_DATA_HEIGHT = 0.25;

/** Past hours are drawn at this opacity (`opacity-60`). */
export const PAST_OPACITY = 0.6;

export const LANE = {
  /** `h-10`: the lane's height. */
  bar: 40,
  /** `gap-px`. */
  cellGap: 1,
  /** `h-5`: the time axis row. */
  axis: 20,
  /** `size-8`: the pin's disc. */
  pin: 32,
  /** The legend swatch width (`w-3`). */
  legendWidth: 12,
  /** Marker for the current hour (`inset 2px` rule). */
  nowRule: 2,
  /** The dot before an activity's name (`h-2.5 w-2.5`). */
  dot: 10,
  /** The lane's left inset (`pl-4`). */
  inset: 16,
  /** An activity icon disc in the advice card (`h-9 w-9`). */
  iconDisc: 36,
  /** The feasibility chart's plot height (`aspect-[16/5]` at card width). */
  trendHeight: 96,
  /** The width of the chart's rating-word column (Poor to Excellent). */
  yAxis: 64,
  /** The chart line's width (`borderWidth: 2` in the web's Chart.js line). */
  trendStroke: 2,
  /** A gridline's width. */
  gridStroke: 1,
  /** The picker tile's minimum height (`min-h-[88px]`). */
  pickerTile: 88,
  /** The selected-check disc on a picker tile (`h-5 w-5`). */
  check: 20,
  /** A bullet before a tip (`h-1.5 w-1.5`). */
  bullet: 6,
  /** The sheet's grabber (iOS draws its own; this is the Android one). */
  grabberWidth: 36,
  grabberHeight: 5,
} as const;
