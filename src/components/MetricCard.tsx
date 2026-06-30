/**
 * Mobile metric card — mirrors mukoko-weather's MetricCard.
 *
 * Renders a label (small, secondary), a primary value (display weight), an
 * optional unit, and an optional supporting line. Wraps the canonical
 * `BaobabCard` so every metric inherits the brand chrome (surface-card bg,
 * border, shadow, radius).
 *
 * Optional severity prop tints the value via a mineral token (success,
 * accent, terracotta, primary, sodalite) for quick at-a-glance reading.
 */

import { StyleSheet, View, type ViewProps } from 'react-native';

import { SPACING } from '@/brand/tokens';
import { BaobabCard } from '@/components/BaobabCard';
import { BrandText } from '@/components/BrandText';

export type MetricSeverity = 'low' | 'moderate' | 'high' | 'severe' | 'extreme' | 'cold';

export type MetricCardProps = ViewProps & {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  /** Single-glyph icon shown in the top-right corner. */
  icon?: string;
  /** Supporting context line shown below the value (e.g. "Cooler than actual"). */
  supporting?: string;
  /** Severity colour for the value text. Maps to a mineral token. */
  severity?: MetricSeverity;
};

const SEVERITY_TONE: Record<MetricSeverity, 'success' | 'accent' | 'terracotta' | 'frostSevere' | 'primary'> = {
  low: 'success',
  moderate: 'accent',
  high: 'terracotta',
  severe: 'frostSevere',
  extreme: 'frostSevere',
  cold: 'primary',
};

export function MetricCard({
  label,
  value,
  unit,
  icon,
  supporting,
  severity,
  style,
  ...rest
}: MetricCardProps) {
  const displayValue =
    value === null || value === undefined || value === ''
      ? '—'
      : typeof value === 'number'
        ? Math.round(value).toString()
        : value;

  const valueTone = severity ? SEVERITY_TONE[severity] : 'text';

  return (
    <BaobabCard
      {...rest}
      style={[styles.card, style]}
      accessibilityRole="summary"
      accessibilityLabel={`${label}: ${displayValue}${unit ? ' ' + unit : ''}`}>
      <View style={styles.headRow}>
        <BrandText variant="small" tone="textSecondary" style={styles.label}>
          {label}
        </BrandText>
        {icon ? (
          <BrandText
            variant="body"
            tone="textTertiary"
            importantForAccessibility="no-hide-descendants"
            accessible={false}>
            {icon}
          </BrandText>
        ) : null}
      </View>
      <View style={styles.valueRow}>
        <BrandText variant="display" tone={valueTone}>
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
    </BaobabCard>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 96,
    flexGrow: 1,
    flexBasis: 0,
    gap: SPACING.xs,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    flexShrink: 1,
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
