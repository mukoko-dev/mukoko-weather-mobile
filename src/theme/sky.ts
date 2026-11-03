/**
 * The page sky: eight condition families, each a three-stop vertical gradient
 * in light and in dark, mirrored from the web (`--sky-<family>-top|mid|bottom`
 * in mukoko-weather `src/app/globals.css`). White text sits on every stop at
 * 4.5:1 or better (src/__tests__/sky.test.ts computes all 8 x 2 x 3 stops).
 *
 * Static only. The faint texture (stars on the night skies, diagonal streaks on
 * rain and storms) is drawn once and never moves.
 */

import { type SkyFamily } from "@/shared/hero";

export type SkyStops = {
  top: string;
  mid: string;
  bottom: string;
  /** Where the mid stop sits down the sky, 0 to 1 (`--kestrel-mid-at`). */
  midAt: number;
};

/** `--sky-fg` and the dimmer white for secondary lines. */
export const SKY_FG = "#ffffff";
export const SKY_FG_DIM = "#e6eaf8";

export const SKY_FAMILIES: readonly SkyFamily[] = [
  "clear-day",
  "clear-night",
  "cloudy-day",
  "cloudy-night",
  "fog",
  "rain",
  "storm",
  "snow",
] as const;

const LIGHT: Record<SkyFamily, SkyStops> = {
  "clear-day": {
    top: "#1b5aa6",
    mid: "#2563a8",
    bottom: "#2c69ab",
    midAt: 0.5,
  },
  "clear-night": {
    top: "#0b1026",
    mid: "#151c42",
    bottom: "#1c2550",
    midAt: 0.55,
  },
  "cloudy-day": {
    top: "#4a5563",
    mid: "#515c6b",
    bottom: "#5a6574",
    midAt: 0.5,
  },
  "cloudy-night": {
    top: "#141a26",
    mid: "#1e2636",
    bottom: "#2b3548",
    midAt: 0.55,
  },
  fog: { top: "#565d66", mid: "#5a6169", bottom: "#5f666e", midAt: 0.5 },
  rain: { top: "#3a4656", mid: "#4a5768", bottom: "#3e4a5a", midAt: 0.45 },
  storm: { top: "#231f30", mid: "#33293f", bottom: "#453a5c", midAt: 0.5 },
  snow: { top: "#3f566f", mid: "#476079", bottom: "#4f6a88", midAt: 0.5 },
};

/**
 * Dark theme: the day skies, fog, storm and snow drop to deep dusk. The night
 * and rain skies are the owner's mockup values and are the same in both.
 */
const DARK: Record<SkyFamily, SkyStops> = {
  ...LIGHT,
  "clear-day": {
    top: "#0d2547",
    mid: "#153a68",
    bottom: "#1d4a80",
    midAt: 0.5,
  },
  "cloudy-day": {
    top: "#262d37",
    mid: "#303946",
    bottom: "#3a4553",
    midAt: 0.5,
  },
  "cloudy-night": {
    top: "#0f1319",
    mid: "#171d26",
    bottom: "#1f2833",
    midAt: 0.55,
  },
  fog: { top: "#2a2f35", mid: "#373d44", bottom: "#444b53", midAt: 0.5 },
  storm: { top: "#0f0c17", mid: "#1b1626", bottom: "#2a2238", midAt: 0.5 },
  snow: { top: "#1f2d3e", mid: "#2c4057", bottom: "#3c5672", midAt: 0.5 },
};

export function skyStops(family: SkyFamily, dark: boolean): SkyStops {
  return (dark ? DARK : LIGHT)[family];
}

/** A neutral overcast day, for a place whose weather has not arrived yet. */
export const NEUTRAL_SKY: SkyFamily = "cloudy-day";

/**
 * Stars on a night sky: x and y as a percent of the sky box, and a radius in
 * dp. The same ten points as the web's `.kestrel-stars`.
 */
export const STARS: readonly { x: number; y: number; r: number }[] = [
  { x: 12, y: 9, r: 1 },
  { x: 31, y: 4, r: 1 },
  { x: 74, y: 7, r: 1.5 },
  { x: 88, y: 14, r: 1 },
  { x: 8, y: 26, r: 1 },
  { x: 52, y: 19, r: 1 },
  { x: 93, y: 33, r: 1.5 },
  { x: 22, y: 38, r: 1 },
  { x: 63, y: 31, r: 1 },
  { x: 40, y: 12, r: 1 },
];
export const STARS_OPACITY = 0.55;

/** Rain streaks: `repeating-linear-gradient(105deg, fg 0 1px, transparent 1px 14px)`. */
export const STREAKS = {
  angleDeg: 105,
  height: 340,
  period: 14,
  width: 1,
  opacity: 0.12,
} as const;

/** The sky is one screen and 8rem tall, never under 60rem; it fades over 6rem. */
export const SKY_REACH = { extra: 128, floor: 960, fade: 96 } as const;

/** The height of the sky box for a window height. */
export function skyReach(windowHeight: number): number {
  return Math.max(windowHeight + SKY_REACH.extra, SKY_REACH.floor);
}

/**
 * The translucent surfaces on the sky, all the sky foreground at low alpha:
 * the Conditions card (`.kestrel-card`) and the round controls
 * (`.kestrel-round`). Borders, not shadows; no blur.
 */
export const SKY_SURFACE = {
  card: { fill: 0.07, border: 0.16 },
  round: { fill: 0.08, fillPressed: 0.16, border: 0.22 },
} as const;
