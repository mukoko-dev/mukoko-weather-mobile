/**
 * Mobile metric card — mirrors mukoko-weather's MetricCard.
 * Shows a label, a primary value (mono), an optional unit, and an optional
 * supporting line. Tap target is full-card so it can be linked.
 */

import { StyleSheet, View, type ViewProps } from 'react-native';

import { RADIUS, SPACING } from '@/brand/tokens';
import { BrandText } from '@/components/BrandText';
import { usePalette } from '@/hooks/usePalette';

export type MetricCardProps = ViewProps & {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  supporting?: string;
};

export function MetricCard({
  label,
  value,
  unit,
  supporting,
  style,
  ...rest
}: MetricCardProps) {
  const palette = usePalette();

  const displayValue =
    value === null || value === undefined || value === ''
      ? '—'
      : typeof value === 'number'
        ? Math.round(value).toString()
        : value;

  return (
    <View
      {...rest}
      style={[
        styles.card,
        { backgroundColor: palette.surface, borderColor: palette.border },
        style,
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`${label}: ${displayValue}${unit ? ' ' + unit : ''}`}>
      <BrandText variant="small" tone="textSecondary">
        {label}
      </BrandText>
      <View style={styles.valueRow}>
        <BrandText variant="display" tone="text">
          {displayValue}
        </BrandText>
        {unit ? (
          <BrandText variant="bodyBold" tone="textSecondary" style={styles.unit}>
            {unit}
          </BrandText>
        ) : null}
      </View>
      {supporting ? (
        <BrandText variant="caption" tone="textTertiary">
          {supporting}
        </BrandText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.md,
    borderRadius: RADIUS.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: SPACING.xs,
    minHeight: 96,
    flexGrow: 1,
    flexBasis: 0,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
  },
  unit: {
    marginLeft: SPACING.xs,
  },
});
