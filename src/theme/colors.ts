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
  background: '#FAF9F5',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceDim: SURFACE.paper,

  text: SURFACE.ink,
  textSecondary: '#52524E',
  textTertiary: '#706F6A',
  textInverse: '#FFFFFF',

  border: 'rgba(20, 20, 19, 0.08)',
  borderStrong: 'rgba(20, 20, 19, 0.16)',

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
  background: '#0F0F0E',
  surface: '#1A1A18',
  surfaceElevated: '#222220',
  surfaceDim: SURFACE.stone,

  text: '#F5F5F4',
  textSecondary: '#B0B4BA',
  textTertiary: '#8A8E94',
  textInverse: SURFACE.ink,

  border: 'rgba(245, 245, 244, 0.10)',
  borderStrong: 'rgba(245, 245, 244, 0.20)',

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
