/**
 * Typography scale for Mukoko mobile. Uses the same family stack as web:
 *   - Noto Serif  -> display / wordmark
 *   - Noto Sans   -> UI body
 *   - JetBrains Mono -> code, data labels (temperatures, station IDs)
 *
 * Sizes are in dp/sp; line heights are absolute (not multipliers) to keep
 * vertical rhythm predictable across platforms.
 */

import { TextStyle } from 'react-native';

import { FONT_FAMILY, FONT_SIZE } from '@/brand/tokens';

export const typography = {
  hero: {
    fontFamily: FONT_FAMILY.display,
    fontSize: FONT_SIZE.hero,
    lineHeight: 56,
  } satisfies TextStyle,
  display: {
    fontFamily: FONT_FAMILY.display,
    fontSize: FONT_SIZE.display,
    lineHeight: 40,
  } satisfies TextStyle,
  title: {
    fontFamily: FONT_FAMILY.bodyBold,
    fontSize: FONT_SIZE.xl,
    lineHeight: 32,
  } satisfies TextStyle,
  subtitle: {
    fontFamily: FONT_FAMILY.bodyBold,
    fontSize: FONT_SIZE.lg,
    lineHeight: 28,
  } satisfies TextStyle,
  body: {
    fontFamily: FONT_FAMILY.body,
    fontSize: FONT_SIZE.base,
    lineHeight: 24,
  } satisfies TextStyle,
  bodyBold: {
    fontFamily: FONT_FAMILY.bodyBold,
    fontSize: FONT_SIZE.base,
    lineHeight: 24,
  } satisfies TextStyle,
  small: {
    fontFamily: FONT_FAMILY.body,
    fontSize: FONT_SIZE.sm,
    lineHeight: 20,
  } satisfies TextStyle,
  smallBold: {
    fontFamily: FONT_FAMILY.bodyBold,
    fontSize: FONT_SIZE.sm,
    lineHeight: 20,
  } satisfies TextStyle,
  caption: {
    fontFamily: FONT_FAMILY.body,
    fontSize: FONT_SIZE.xs,
    lineHeight: 16,
  } satisfies TextStyle,
  mono: {
    fontFamily: FONT_FAMILY.mono,
    fontSize: FONT_SIZE.sm,
    lineHeight: 20,
  } satisfies TextStyle,
  monoLarge: {
    fontFamily: FONT_FAMILY.mono,
    fontSize: FONT_SIZE.lg,
    lineHeight: 28,
  } satisfies TextStyle,
} as const;

export type TypographyVariant = keyof typeof typography;
