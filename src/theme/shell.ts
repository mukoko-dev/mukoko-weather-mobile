/**
 * Tokens for the app shell (the floating bottom bar and its places lane),
 * mirrored from the web: `--mobile-nav-*` in mukoko-weather
 * `src/app/globals.css`, the vendored Mzizi bottom nav
 * (`src/components/ui/mzizi-bottom-nav.tsx`) and the `.lark` place chip. The
 * page colours themselves come from src/theme/mzizi.ts.
 */

import { type ColorSchemeName } from "react-native";

/** The floating bar's geometry, in dp. */
export const BAR = {
  /** `--mobile-nav-bar-height`: 4rem. */
  height: 64,
  /** `--mobile-nav-inset`: the lift off the bottom, above the safe area. */
  lift: 12,
  /** `left-4 right-4`: inset from both screen edges. */
  side: 16,
  /** The breath `--mobile-nav-clearance` adds above the bar (0.5rem). */
  breath: 8,
  /** `max-w-md`: the widest the bar grows on a tablet. */
  maxWidth: 448,
  /** Padding inside the pill around its items (`p-1`). */
  pad: 4,
  /** `max-w-[10rem]`: the widest a place chip grows. */
  chipMax: 160,
  /** The current chip's fill opacity on the translucent bar (`bg-card/90`). */
  surfaceAlpha: 0.94,
} as const;

/**
 * The space page content leaves at the bottom so nothing sits under the bar:
 * `--mobile-nav-clearance` = safe area + lift + bar + breath.
 */
export function barClearance(safeAreaBottom: number): number {
  return safeAreaBottom + BAR.lift + BAR.height + BAR.breath;
}

export type ChipColors = {
  /** `--muted`: a resting chip. */
  rest: string;
  /** `--container-cobalt`: the current page's chip. */
  active: string;
  /** `--on-container-cobalt`: text and glyph on the current chip. */
  onActive: string;
};

const LIGHT_CHIP: ChipColors = {
  rest: "#f3f2ee",
  active: "#e3f2fd",
  onActive: "#002966",
};

const DARK_CHIP: ChipColors = {
  rest: "#1e1e1e",
  active: "#001f3f",
  onActive: "#b3e5fc",
};

export function chipColorsFor(scheme: ColorSchemeName): ChipColors {
  return scheme === "dark" ? DARK_CHIP : LIGHT_CHIP;
}
