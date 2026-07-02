/**
 * FilterChip — a single pill in the Explore browse rows (category / country).
 *
 * Selected chips fill with their mineral tone and use inverse text; unselected
 * chips are outlined and tint their label with the tone. Visual height is 44
 * but `hitSlop` expands the touch target past the 56px minimum.
 */

import { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { RADIUS, SPACING } from '@/brand/tokens';
import { BrandText } from '@/components/BrandText';
import { usePalette } from '@/hooks/usePalette';

import type { CategoryTone } from './categories';

export type FilterChipProps = {
  label: string;
  /** Mineral tone for the fill (selected) / accent (unselected). */
  tone?: CategoryTone;
  selected?: boolean;
  /** Optional count shown after the label. */
  count?: number;
  /** Optional leading glyph (e.g. a country flag emoji). */
  leading?: string;
  onPress: () => void;
};

const HIT_SLOP = { top: 8, bottom: 8, left: 4, right: 4 };

export const FilterChip = memo(function FilterChip({
  label,
  tone = 'primary',
  selected = false,
  count,
  leading,
  onPress,
}: FilterChipProps) {
  const palette = usePalette();
  const accent = palette[tone];

  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={count != null ? `${label}, ${count} locations` : label}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? accent : 'transparent',
          borderColor: selected ? accent : palette.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      {leading ? (
        <BrandText variant="smallBold" tone={selected ? 'textInverse' : 'text'}>
          {leading}{' '}
        </BrandText>
      ) : null}
      <BrandText variant="smallBold" tone={selected ? 'textInverse' : tone}>
        {label}
      </BrandText>
      {count != null ? (
        <BrandText variant="caption" tone={selected ? 'textInverse' : 'textTertiary'}>
          {'  '}
          {count}
        </BrandText>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
});
