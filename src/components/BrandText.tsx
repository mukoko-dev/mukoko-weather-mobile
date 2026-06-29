/**
 * Branded Text wrapper. Picks a typography variant and resolves color from
 * the active palette.
 */

import { Text, type TextProps } from 'react-native';

import { typography, type TypographyVariant } from '@/theme/typography';
import { type Palette } from '@/theme/colors';
import { usePalette } from '@/hooks/usePalette';

type Tone = keyof Pick<
  Palette,
  | 'text'
  | 'textSecondary'
  | 'textTertiary'
  | 'textInverse'
  | 'primary'
  | 'tanzanite'
  | 'success'
  | 'accent'
  | 'sodalite'
  | 'copper'
  | 'terracotta'
  | 'frostSevere'
>;

export type BrandTextProps = TextProps & {
  variant?: TypographyVariant;
  tone?: Tone;
};

export function BrandText({
  style,
  variant = 'body',
  tone = 'text',
  ...rest
}: BrandTextProps) {
  const palette = usePalette();
  return <Text {...rest} style={[typography[variant], { color: palette[tone] }, style]} />;
}
