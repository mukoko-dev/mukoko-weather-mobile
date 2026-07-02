/**
 * Hero current-conditions card for the location detail screen.
 *
 * Big temperature + condition glyph, the condition description, a feels-like
 * line (with cooler/warmer context), and today's high / low. Wraps the
 * canonical `BaobabCard` so it inherits brand chrome (surface, border, radius,
 * shadow) exactly like the home Weather tab hero.
 */

import { StyleSheet, View } from 'react-native';

import type { WeatherResponse } from '@/api/weather';
import { SPACING } from '@/brand/tokens';
import { BaobabCard } from '@/components/BaobabCard';
import { BrandText } from '@/components/BrandText';
import { WeatherIcon } from '@/components/WeatherIcon';
import { feelsLikeContext } from '@/shared';

function deg(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${Math.round(value)}°`;
}

export function HeroConditions({ weather }: { weather: WeatherResponse }) {
  const { current, daily } = weather;
  const today = daily[0];

  const hasTemp = current.temperature !== null && current.temperature !== undefined;
  const hasFeels = current.feelsLike !== null && current.feelsLike !== undefined;
  const hasHigh = today?.tempMax !== null && today?.tempMax !== undefined;
  const hasLow = today?.tempMin !== null && today?.tempMin !== undefined;

  const a11y = [
    hasTemp ? `${Math.round(current.temperature!)} degrees` : 'Temperature unavailable',
    current.description,
    hasFeels ? `feels like ${Math.round(current.feelsLike!)} degrees` : undefined,
    hasHigh ? `high ${Math.round(today.tempMax!)} degrees` : undefined,
    hasLow ? `low ${Math.round(today.tempMin!)} degrees` : undefined,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <BaobabCard
      style={styles.hero}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={a11y}>
      <WeatherIcon code={current.weatherCode} variant="hero" />
      <BrandText variant="hero" tone="text">
        {hasTemp ? `${Math.round(current.temperature!)}°` : '—'}
      </BrandText>

      {current.description ? (
        <BrandText variant="subtitle" tone="textSecondary" style={styles.centerText}>
          {current.description}
        </BrandText>
      ) : null}

      {hasFeels && hasTemp ? (
        <BrandText variant="small" tone="textTertiary" style={styles.centerText}>
          {feelsLikeContext(current.feelsLike!, current.temperature!)} — feels like{' '}
          {Math.round(current.feelsLike!)}°
        </BrandText>
      ) : null}

      {hasHigh || hasLow ? (
        <View style={styles.highLow}>
          <BrandText variant="bodyBold" tone="terracotta">
            H {deg(today?.tempMax)}
          </BrandText>
          <BrandText variant="bodyBold" tone="primary">
            L {deg(today?.tempMin)}
          </BrandText>
        </View>
      ) : null}
    </BaobabCard>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.xs,
  },
  centerText: {
    textAlign: 'center',
  },
  highLow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
});
