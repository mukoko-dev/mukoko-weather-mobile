/**
 * BaobabCard — the canonical card surface for the mobile app.
 *
 * Mirrors the web `.baobab` fauna class from globals.css:
 *   rounded-card (16) · border on primary/25 · surface-card bg · padding · shadow-sm
 *
 * Cards in mukoko-mobile use this wrapper instead of restyling Views
 * individually. Keeps shadow/border/padding consistent everywhere.
 */

import { StyleSheet, View, type ViewProps } from 'react-native';

import { RADIUS, SPACING } from '@/brand/tokens';
import { usePalette } from '@/hooks/usePalette';

export type BaobabCardProps = ViewProps & {
  /** Use a quieter card surface (matches `.acacia` from the web). Default false. */
  quiet?: boolean;
  /** Override padding. Default SPACING.md (16). */
  padding?: number;
};

export function BaobabCard({
  children,
  quiet = false,
  padding = SPACING.md,
  style,
  ...rest
}: BaobabCardProps) {
  const palette = usePalette();
  return (
    <View
      {...rest}
      style={[
        styles.card,
        {
          padding,
          backgroundColor: palette.surface,
          borderColor: quiet ? palette.border : palette.primary + '40', // ~25% alpha
        },
        !quiet && styles.shadow,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  shadow: {
    // Shadow-sm equivalent — soft elevation. iOS uses shadow*, Android uses elevation.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
});
