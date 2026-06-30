/**
 * Mobile theme palette — light + dark. Derived from MINERALS in src/brand/tokens.ts.
 * Mirrors mukoko-weather's semantic tokens (primary = cobalt, success = malachite,
 * accent = gold, AI = sodalite/tanzanite, community = copper).
 */

import { MINERALS, SURFACE } from '@/brand/tokens';

export type Palette = {
  /** App background — paper-warm. */
  background: string;
  /** Slightly elevated surface (cards). */
  surface: string;
  /** Even more elevated (modals, sheets). */
  surfaceElevated: string;
  /** Subtle background tint (skeleton, dim cards). */
  surfaceDim: string;

  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  border: string;
  borderStrong: string;

  /** Cobalt — primary CTAs, links. */
  primary: string;
  onPrimary: string;
  /** Malachite — growth, success. */
  success: string;
  onSuccess: string;
  /** Gold — warmth, sun, rewards. */
  accent: string;
  onAccent: string;
  /** Tanzanite — brand mark, AI premium. */
  tanzanite: string;
  onTanzanite: string;
  /** Sodalite — Shamwari / AI surfaces. */
  sodalite: string;
  onSodalite: string;
  /** Copper — community, reports. */
  copper: string;
  onCopper: string;
  /** Terracotta — earth, grounding. */
  terracotta: string;
  onTerracotta: string;

  /** Frost / cold severity. */
  frostSevere: string;
  /** Focus ring (high-contrast cobalt). */
  focusRing: string;
};

export const lightPalette: Palette = {
  // Paper-warm — matches web `--color-paper` (#FAF9F5)
  background: '#FAF9F5',
  // Surface-card — clean white for `.baobab` chrome
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceDim: SURFACE.paper,

  // Near-black ink — matches web `--color-text-primary` (#1a1a1a)
  text: '#1A1A1A',
  textSecondary: 'rgba(0, 0, 0, 0.65)',
  textTertiary: 'rgba(0, 0, 0, 0.45)',
  textInverse: '#FFFFFF',

  border: 'rgba(0, 0, 0, 0.08)',
  borderStrong: 'rgba(0, 0, 0, 0.16)',

  primary: MINERALS.cobalt.light,
  onPrimary: '#FFFFFF',
  success: MINERALS.malachite.light,
  onSuccess: '#FFFFFF',
  accent: MINERALS.gold.light,
  onAccent: '#FFFFFF',
  tanzanite: MINERALS.tanzanite.light,
  onTanzanite: '#FFFFFF',
  sodalite: MINERALS.sodalite.light,
  onSodalite: '#FFFFFF',
  copper: MINERALS.copper.light,
  onCopper: '#FFFFFF',
  terracotta: MINERALS.terracotta.light,
  onTerracotta: '#FFFFFF',

  frostSevere: '#B3261E',
  focusRing: MINERALS.cobalt.light,
};

export const darkPalette: Palette = {
  // Tanzanite-dark scrim — matches web dark `--color-paper` zone (#1A0033 mood)
  background: '#0A0A0A',
  // Translucent surface — lifts cards without flatness
  surface: 'rgba(255, 255, 255, 0.05)',
  surfaceElevated: 'rgba(255, 255, 255, 0.08)',
  surfaceDim: '#141414',

  text: '#F5F5F5',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textTertiary: 'rgba(255, 255, 255, 0.5)',
  textInverse: SURFACE.ink,

  border: 'rgba(255, 255, 255, 0.1)',
  borderStrong: 'rgba(255, 255, 255, 0.2)',

  primary: MINERALS.cobalt.dark,
  onPrimary: SURFACE.ink,
  success: MINERALS.malachite.dark,
  onSuccess: SURFACE.ink,
  accent: MINERALS.gold.dark,
  onAccent: SURFACE.ink,
  tanzanite: MINERALS.tanzanite.dark,
  onTanzanite: SURFACE.ink,
  sodalite: MINERALS.sodalite.dark,
  onSodalite: SURFACE.ink,
  copper: MINERALS.copper.dark,
  onCopper: SURFACE.ink,
  terracotta: MINERALS.terracotta.dark,
  onTerracotta: SURFACE.ink,

  frostSevere: '#FF6E5A',
  focusRing: MINERALS.cobalt.dark,
};

export type ColorScheme = 'light' | 'dark';

export function paletteFor(scheme: ColorScheme): Palette {
  return scheme === 'dark' ? darkPalette : lightPalette;
}
