/**
 * Condition-based hero mood — maps a WMO weather code (+ day/night) to a
 * subtle background "mood", then resolves that mood to tint colours drawn
 * from the active Mzizi mineral palette.
 *
 * The mood buckets mirror `WeatherIcon`'s `iconForWmo` ranges so the hero
 * background always agrees with the glyph on top of it:
 *   clear -> warm glow (gold)     · rain -> cool cobalt blue
 *   cloudy/fog -> neutral drift    · thunder -> tanzanite storm
 *   snow -> pale frost             · night variants lean sodalite
 *
 * Everything here is pure — no React, no palette side effects — so the
 * mapping is unit-testable in Node. Colour resolution takes the palette as
 * an argument (`moodColors`) rather than importing a hook.
 */

import { type Palette } from '@/theme/colors';

export type HeroMoodKey =
  | 'clear-day'
  | 'clear-night'
  | 'partly-day'
  | 'partly-night'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'thunder';

/**
 * Bucket a WMO weather code into a hero mood. `isDay` only affects the two
 * lightest conditions (clear / partly cloudy) where sky colour flips between
 * a warm daytime glow and a deep night wash.
 */
export function heroMoodFor(code: number | null | undefined, isDay = true): HeroMoodKey {
  if (code === null || code === undefined) return isDay ? 'partly-day' : 'partly-night';
  if (code === 0) return isDay ? 'clear-day' : 'clear-night';
  if (code >= 1 && code <= 2) return isDay ? 'partly-day' : 'partly-night';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if (code >= 61 && code <= 67) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'rain';
  if (code >= 85 && code <= 86) return 'snow';
  if (code >= 95 && code <= 99) return 'thunder';
  return 'cloudy';
}

/** Resolved tint colours for a hero mood — all low-alpha so text stays legible. */
export type HeroMoodColors = {
  /** Full-bleed wash behind the content (very subtle). */
  base: string;
  /** Warmer / primary soft orb. */
  orbA: string;
  /** Cooler / secondary soft orb. */
  orbB: string;
};

/**
 * Append a 2-digit hex alpha to a `#RRGGBB` colour. Mineral tokens and the
 * text ink are always 6-digit hex, so this stays exact; anything else is
 * returned untouched (so we never emit an invalid colour string).
 */
export function withAlpha(hex: string, alpha: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? `${hex}${alpha}` : hex;
}

// Alpha stops (hex). Kept low — the hero is a reading surface first.
const WASH = '14'; // ~8%
const ORB_SOFT = '1f'; // ~12%
const ORB_WARM = '2b'; // ~17%

/** Map a mood to palette-derived tint colours. */
export function moodColors(mood: HeroMoodKey, palette: Palette): HeroMoodColors {
  switch (mood) {
    case 'clear-day':
      // Warm gold glow with a cobalt sky counterpoint.
      return {
        base: withAlpha(palette.accent, WASH),
        orbA: withAlpha(palette.accent, ORB_WARM),
        orbB: withAlpha(palette.primary, ORB_SOFT),
      };
    case 'clear-night':
      return {
        base: withAlpha(palette.sodalite, WASH),
        orbA: withAlpha(palette.sodalite, ORB_SOFT),
        orbB: withAlpha(palette.tanzanite, ORB_SOFT),
      };
    case 'partly-day':
      return {
        base: withAlpha(palette.primary, WASH),
        orbA: withAlpha(palette.primary, ORB_SOFT),
        orbB: withAlpha(palette.accent, ORB_SOFT),
      };
    case 'partly-night':
      return {
        base: withAlpha(palette.sodalite, WASH),
        orbA: withAlpha(palette.sodalite, ORB_SOFT),
        orbB: withAlpha(palette.primary, ORB_SOFT),
      };
    case 'cloudy':
      // Neutral grey drift that adapts to light/dark via the text ink.
      return {
        base: withAlpha(palette.text, WASH),
        orbA: withAlpha(palette.text, ORB_SOFT),
        orbB: withAlpha(palette.primary, WASH),
      };
    case 'fog':
      return {
        base: withAlpha(palette.text, WASH),
        orbA: withAlpha(palette.text, ORB_SOFT),
        orbB: withAlpha(palette.text, WASH),
      };
    case 'drizzle':
      return {
        base: withAlpha(palette.primary, WASH),
        orbA: withAlpha(palette.primary, ORB_SOFT),
        orbB: withAlpha(palette.success, ORB_SOFT),
      };
    case 'rain':
      return {
        base: withAlpha(palette.primary, WASH),
        orbA: withAlpha(palette.primary, ORB_WARM),
        orbB: withAlpha(palette.sodalite, ORB_SOFT),
      };
    case 'snow':
      return {
        base: withAlpha(palette.primary, WASH),
        orbA: withAlpha(palette.primary, ORB_SOFT),
        orbB: withAlpha(palette.text, WASH),
      };
    case 'thunder':
      return {
        base: withAlpha(palette.tanzanite, WASH),
        orbA: withAlpha(palette.tanzanite, ORB_WARM),
        orbB: withAlpha(palette.sodalite, ORB_SOFT),
      };
  }
}
