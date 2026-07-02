/**
 * 7-day forecast list. Each row: condition glyph + day label on the left,
 * precipitation-probability hint + low/high temps on the right. Rendered inside
 * a single quiet `BaobabCard` with hairline dividers, matching the home tab.
 */

import { StyleSheet, View } from 'react-native';

import type { DailyForecast as DailyItem, WeatherResponse } from '@/api/weather';
import { SPACING } from '@/brand/tokens';
import { BaobabCard } from '@/components/BaobabCard';
import { BrandText } from '@/components/BrandText';
import { WeatherIcon } from '@/components/WeatherIcon';
import { SectionHeading } from '@/components/detail/SectionHeading';
import { usePalette } from '@/hooks/usePalette';

function deg(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${Math.round(value)}°`;
}

function DailyRow({ day, isLast }: { day: DailyItem; isLast: boolean }) {
  const palette = usePalette();
  const date = day.date ? new Date(day.date) : null;
  const label =
    date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
      : '—';
  const precip =
    day.precipitationProbability !== null && day.precipitationProbability !== undefined
      ? `💧 ${Math.round(day.precipitationProbability)}%`
      : null;

  const a11y = [label, `low ${deg(day.tempMin)}`, `high ${deg(day.tempMax)}`, day.description]
    .filter(Boolean)
    .join(', ');

  return (
    <View
      accessible
      accessibilityLabel={a11y}
      style={[
        styles.row,
        !isLast && {
          borderBottomColor: palette.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}>
      <View style={styles.left}>
        <WeatherIcon code={day.weatherCode} variant="title" />
        <BrandText variant="bodyBold" tone="text">
          {label}
        </BrandText>
      </View>
      <View style={styles.right}>
        {precip ? (
          <BrandText variant="caption" tone="primary" style={styles.precip}>
            {precip}
          </BrandText>
        ) : null}
        <BrandText variant="mono" tone="textSecondary">
          {deg(day.tempMin)}
        </BrandText>
        <BrandText variant="monoLarge" tone="text">
          {deg(day.tempMax)}
        </BrandText>
      </View>
    </View>
  );
}

export function DailyForecast({ weather }: { weather: WeatherResponse }) {
  const days = weather.daily.slice(0, 7);
  if (days.length === 0) return null;
  return (
    <View>
      <SectionHeading>7-day forecast</SectionHeading>
      <BaobabCard quiet accessibilityRole="list">
        {days.map((day, index) => (
          <DailyRow key={day.date ?? index} day={day} isLast={index === days.length - 1} />
        ))}
      </BaobabCard>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingVertical: SPACING.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
  },
  precip: {
    alignSelf: 'center',
  },
});
