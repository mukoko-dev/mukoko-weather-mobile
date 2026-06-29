/**
 * Brand header — wordmark + optional right action.
 * Renders the seven-mineral stripe along the bottom (1px tall on phones)
 * to echo the web header.
 */

import { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { MINERALS, RADIUS, SPACING } from '@/brand/tokens';
import { BrandText } from '@/components/BrandText';
import { usePalette } from '@/hooks/usePalette';

export type HeaderProps = ViewProps & {
  title?: string;
  subtitle?: string;
  trailing?: ReactNode;
};

const STRIPE_ORDER = [
  MINERALS.cobalt.light,
  MINERALS.gold.light,
  MINERALS.malachite.light,
  MINERALS.copper.light,
  MINERALS.sodalite.light,
  MINERALS.terracotta.light,
  MINERALS.tanzanite.light,
] as const;

export function Header({ title = 'mukoko', subtitle, trailing, style, ...rest }: HeaderProps) {
  const palette = usePalette();
  return (
    <View
      {...rest}
      style={[
        styles.container,
        { backgroundColor: palette.background, borderBottomColor: palette.border },
        style,
      ]}>
      <View style={styles.row}>
        <View style={styles.titleBlock}>
          <BrandText variant="title" tone="tanzanite">
            {title}
          </BrandText>
          {subtitle ? (
            <BrandText variant="small" tone="textSecondary">
              {subtitle}
            </BrandText>
          ) : null}
        </View>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      <View style={styles.stripe} accessibilityElementsHidden>
        {STRIPE_ORDER.map((color) => (
          <View key={color} style={[styles.stripeSegment, { backgroundColor: color }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: RADIUS.sm,
    borderTopRightRadius: RADIUS.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  titleBlock: {
    flexShrink: 1,
  },
  trailing: {
    flexShrink: 0,
  },
  stripe: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
    height: 2,
    overflow: 'hidden',
    borderRadius: 1,
  },
  stripeSegment: {
    flex: 1,
  },
});
