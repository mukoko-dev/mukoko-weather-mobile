/**
 * Error state for the location detail screen — a BaobabCard with a warning
 * glyph, the failure message, and a full-width retry button. The button meets
 * the 56dp minimum touch target (TOUCH_TARGET_MIN).
 */

import { Pressable, StyleSheet } from 'react-native';

import { RADIUS, SPACING, TOUCH_TARGET_MIN } from '@/brand/tokens';
import { BaobabCard } from '@/components/BaobabCard';
import { BrandText } from '@/components/BrandText';
import { usePalette } from '@/hooks/usePalette';

export function DetailError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const palette = usePalette();
  return (
    <BaobabCard style={styles.card}>
      <BrandText variant="display" tone="terracotta" accessibilityElementsHidden>
        ⚠
      </BrandText>
      <BrandText variant="bodyBold" tone="terracotta">
        Could not load weather
      </BrandText>
      <BrandText variant="small" tone="textSecondary" style={styles.message}>
        {message}
      </BrandText>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Try again"
        hitSlop={SPACING.sm}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: palette.primary, opacity: pressed ? 0.85 : 1 },
        ]}>
        <BrandText variant="bodyBold" style={{ color: palette.onPrimary }}>
          Try again
        </BrandText>
      </Pressable>
    </BaobabCard>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  message: {
    textAlign: 'center',
  },
  button: {
    marginTop: SPACING.sm,
    minHeight: TOUCH_TARGET_MIN,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
