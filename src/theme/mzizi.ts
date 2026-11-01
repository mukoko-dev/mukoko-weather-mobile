/**
 * The Mzizi page tokens the weather screens use, mirrored from the web app
 * (mukoko-weather `src/app/globals.css` and `mzizi-tokens.css`). The web is the
 * design: when a value changes there, change it here in the same pull request.
 *
 * Everything a weather screen needs for spacing, type, radius, touch size and
 * page colour comes from this file. No weather component writes a number or a
 * hex of its own (src/__tests__/weather-tokens.test.ts scans for that).
 *
 * The rest of the app (Explore, Shamwari, My) still reads src/theme/colors.ts,
 * which has older values. Moving those tabs onto these tokens is a follow-up.
 */

import { type ColorSchemeName } from "react-native";

// ---------------------------------------------------------------------------
// Spacing — `--space-section`, `--space-stack`, `--space-card` and the Tailwind
// steps the web components use inside an item. On a phone the web's `sm`
// breakpoint (card padding 20, page padding 24) never applies.
// ---------------------------------------------------------------------------

export const SPACE = {
  /** Page side padding (`px-4`). Added to the safe-area inset, never under it. */
  gutter: 16,
  /** `--space-section`: between sections of the page. */
  section: 16,
  /** `--space-stack`: heading to card, card to card inside a section. */
  stack: 12,
  /** `--space-card`: padding inside every card surface. */
  card: 16,
  /** `gap-1` / `gap-1.5` / `gap-2` / `gap-2.5`: inside an item. */
  hair: 4,
  tight: 6,
  snug: 8,
  cozy: 10,
  /** `pt-4` above the hero's stack, and the hero's `pb-[26px]`. */
  heroTop: 16,
  heroBottom: 26,
} as const;

// ---------------------------------------------------------------------------
// Type scale — `--text-*` and its leading. Sizes in dp, leading as the ratio.
// Weights are 400, 600 and 700 only.
// ---------------------------------------------------------------------------

export const TYPE = {
  display: { size: 72, leading: 1.1 },
  h2: { size: 36, leading: 1.2 },
  /** The page title on a sub-route (the web's `.elephant`, `text-3xl`). */
  h3: { size: 30, leading: 1.25 },
  h4: { size: 24, leading: 1.3 },
  h5: { size: 20, leading: 1.4 },
  h6: { size: 16, leading: 1.4 },
  bodyLg: { size: 18, leading: 1.6 },
  body: { size: 16, leading: 1.6 },
  bodySm: { size: 14, leading: 1.5 },
  caption: { size: 12, leading: 1.5 },
} as const;

export type TypeToken = keyof typeof TYPE;

/** Line height in dp for a type token. */
export function lineHeightOf(token: TypeToken): number {
  const { size, leading } = TYPE[token];
  return Math.round(size * leading * 100) / 100;
}

export type Weight = 400 | 600 | 700;
export type Family = "sans" | "serif" | "mono";

/** The loaded font file for a family at a weight (src/brand/fonts.ts). */
export const FONT_FILE = {
  sans: {
    400: "NotoSans_400Regular",
    600: "NotoSans_600SemiBold",
    700: "NotoSans_700Bold",
  },
  serif: {
    400: "NotoSerif_400Regular",
    600: "NotoSerif_600SemiBold",
    700: "NotoSerif_600SemiBold",
  },
  mono: {
    400: "JetBrainsMono_400Regular",
    600: "JetBrainsMono_600SemiBold",
    700: "JetBrainsMono_600SemiBold",
  },
} as const satisfies Record<Family, Record<Weight, string>>;

// ---------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------

/** `--radius-card` (lg), `--radius-input` (md), `--radius-sky-card`, pill. */
export const RADIUS = {
  card: 14,
  input: 12,
  sm: 7,
  skyCard: 22,
  pill: 9999,
} as const;

/** `--touch-target-min`. Every control is at least this tall and wide. */
export const TOUCH = { min: 48, default: 56 } as const;

/** `--border-width-rest` / `--border-width-active`, and the sky card hairline. */
export const BORDER = { rest: 0.5, active: 1, sky: 1 } as const;

/** Sizes the web sets as tokens or `rem`. */
export const SIZE = {
  /** `--size-insight-square-min`: 10.5rem. */
  insightMin: 168,
  /** `--size-insight-dial-max`: 14rem. */
  dialMax: 224,
  /** `--size-insight-moon-max`: 9rem. */
  moonMax: 144,
  /** Hour tile minimum width (`min-w-[60px]`). */
  hourTileMin: 60,
  /** Side padding inside a filled pill button (`px-8`). */
  pillPadX: 32,
  /** Widest the page column grows on a tablet. */
  contentMax: 720,
  /** Icon sizes (`size={16}` in a tile header, `size={20}` in a hero line). */
  iconSm: 16,
  iconMd: 20,
  /** Hero rows' glyph beside the condition. */
  iconHero: 20,
  /** A daily row's glyph, and its fixed columns (`w-10`, `w-8`, `w-8`). */
  iconDaily: 18,
  dayColumn: 40,
  iconColumn: 32,
  tempColumn: 32,
  /** The UV colour dot in a daily row's detail line. */
  swatch: 10,
  /** The small navigation / home glyph in the hero's eyebrow. */
  iconEyebrow: 11,
  /** `h-2` temperature range bar. */
  rangeBar: 8,
  /** How far above the page the sky's top colour continues, for overscroll. */
  overscrollCap: 600,
} as const;

// ---------------------------------------------------------------------------
// Page colours — `--background`, `--color-surface-card`, `--border`, the text
// ramp and the few data colours the tiles use. Light and dark are both designs.
// ---------------------------------------------------------------------------

export type PageColors = {
  background: string;
  card: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  /** `--color-primary`: the Mzizi storm family. */
  primary: string;
  /** `--color-rain`. */
  rain: string;
  /** `--color-severity-moderate`: the travelled part of the sun's arc. */
  sun: string;
  moonLit: string;
  moonShadow: string;
  /** `--wx-outline`: the ring on a data colour. */
  outline: string;
  /** `--color-temp-bar-track` and its three bar colours. */
  tempTrack: string;
  tempCool: string;
  tempMild: string;
  tempWarm: string;
  /** Colour of a tile's accent border: minerals at 60% (see MINERAL_EDGE). */
  focusRing: string;
};

export const LIGHT: PageColors = {
  background: "#faf9f5",
  card: "#ffffff",
  border: "#e7e5e0",
  textPrimary: "#141413",
  textSecondary: "#403f3b",
  textTertiary: "#57564f",
  primary: "#284ca6",
  rain: "#0277bd",
  sun: "#5d4037",
  moonLit: "#f3ecd6",
  moonShadow: "#d6d1c4",
  outline: "#5c5b55",
  tempTrack: "rgba(0, 0, 0, 0.06)",
  tempCool: "#00897b",
  tempMild: "#f9a825",
  tempWarm: "#ef6c00",
  focusRing: "#284ca6",
};

export const DARK: PageColors = {
  background: "#1b1a17",
  card: "#100f0e",
  border: "#2a2927",
  textPrimary: "#f5f5f4",
  textSecondary: "#a8a8a3",
  textTertiary: "#838380",
  primary: "#7e9be0",
  rain: "#4fc3f7",
  sun: "#ffd740",
  moonLit: "#f5f0e1",
  moonShadow: "#1d2330",
  outline: "#b5b5b0",
  tempTrack: "rgba(255, 255, 255, 0.08)",
  tempCool: "#26a69a",
  tempMild: "#fdd835",
  tempWarm: "#ff9800",
  focusRing: "#7e9be0",
};

export function pageColorsFor(scheme: ColorSchemeName): PageColors {
  return scheme === "dark" ? DARK : LIGHT;
}

/**
 * The minerals a tile border takes (`EDGE_CLASS` in AtmosphericSummary.tsx),
 * light and dark, from the doctrine's seven minerals. The border is the whole
 * edge at 60%, never one side.
 */
export const MINERAL_EDGE = {
  cobalt: { light: "#0047ab", dark: "#00b0ff" },
  gold: { light: "#5d4037", dark: "#ffd740" },
  copper: { light: "#bf5a36", dark: "#ff8a65" },
  sodalite: { light: "#283593", dark: "#3d5afe" },
  malachite: { light: "#004d40", dark: "#64ffda" },
  tanzanite: { light: "#4b0082", dark: "#b388ff" },
  terracotta: { light: "#a0522d", dark: "#e1b07e" },
} as const;

export type Mineral = keyof typeof MINERAL_EDGE;

/** `#rrggbb` plus an alpha 0 to 1, as an `rgba()` string. */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 1000) / 1000;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** The mineral edge colour: 60% of the mineral in this scheme. */
export function mineralEdge(mineral: Mineral, scheme: ColorSchemeName): string {
  const hex = MINERAL_EDGE[mineral][scheme === "dark" ? "dark" : "light"];
  return withAlpha(hex, 0.6);
}

// ---------------------------------------------------------------------------
// WCAG contrast, for the tests that hold the sky and the tiles to 4.5:1.
// ---------------------------------------------------------------------------

export function relativeLuminance(hex: string): number {
  const n = parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * The WHO UV Index colours (`--wx-uv-1..5`, the same in light and dark).
 * A colour that encodes a weather value follows the convention weather users
 * expect worldwide, never a brand mineral. The hard band edges are
 * `GRADIENT_BREAKS.uv` in src/shared/widget-geometry.ts.
 */
export const WX_UV = [
  "#299501",
  "#f7e400",
  "#f85900",
  "#d8001d",
  "#6b49c8",
] as const;

/** The WHO UV band (0 to 4) for an index: Low, Moderate, High, Very high, Extreme. */
export function uvBandIndex(uv: number | null | undefined): number {
  if (typeof uv !== "number" || !Number.isFinite(uv)) return 0;
  const v = Math.max(0, uv);
  return v <= 2 ? 0 : v <= 5 ? 1 : v <= 7 ? 2 : v <= 10 ? 3 : 4;
}
