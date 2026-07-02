/**
 * Contextual suggested-prompt chips shown on the empty chat state.
 *
 * Sodalite-tinted chips (the Shamwari / AI mineral). Each chip is a full
 * touch target and dispatches its query to the composer. Wraps into a
 * responsive two-per-row grid.
 */

import { Pressable, StyleSheet, View } from 'react-native';

import { RADIUS, SPACING } from '@/brand/tokens';
import { BrandText } from '@/components/BrandText';
import { usePalette } from '@/hooks/usePalette';
import type { SuggestedPrompt } from './prompts';

/** Accessible minimum (Mzizi touch_targets: accessible = 48px). */
const CHIP_MIN_HEIGHT = 48;

export type SuggestedPromptsProps = {
  prompts: SuggestedPrompt[];
  onSelect: (query: string) => void;
  disabled?: boolean;
};

export function SuggestedPrompts({ prompts, onSelect, disabled }: SuggestedPromptsProps) {
  const palette = usePalette();

  return (
    <View style={styles.grid}>
      {prompts.map((prompt) => (
        <Pressable
          key={prompt.query}
          onPress={() => onSelect(prompt.query)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={prompt.label}
          accessibilityHint="Sends this question to Shamwari"
          accessibilityState={{ disabled: !!disabled }}
          style={({ pressed }) => [
            styles.chip,
            {
              backgroundColor: palette.surface,
              borderColor: palette.sodalite + '40', // ~25% alpha
              opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
            },
          ]}>
          <BrandText variant="smallBold" tone="sodalite" numberOfLines={2}>
            {prompt.label}
          </BrandText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    flexGrow: 1,
    flexBasis: '46%',
    minHeight: CHIP_MIN_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.card,
    borderWidth: 1,
  },
});
