/**
 * Hourly forecast — horizontal scroll of the next 24 hours.
 *
 * Each cell shows the hour (or "Now" for the current hour), the condition
 * glyph, the temperature, and precipitation probability. Cells reuse the quiet
 * `BaobabCard` surface so they inherit brand chrome. Renders nothing when the
 * response carries no usable hourly data (see `extractHourly`).
 */

import { ScrollView, StyleSheet, View } from 'react-native';

import { SPACING } from '@/brand/tokens';
import { BaobabCard } from '@/components/BaobabCard';
import { BrandText } from '@/components/BrandText';
import { WeatherIcon } from '@/components/WeatherIcon';
import { SectionHeading } from '@/components/detail/SectionHeading';
import { type HourlyPoint } from '@/components/detail/hourly';
import { formatTime } from '@/shared';

function hourLabel(iso: string, isFirst: boolean): string {
  if (isFirst) return 'Now';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : formatTime(date);
}

function HourCell({ hour, isFirst }: { hour: HourlyPoint; isFirst: boolean }) {
  const label = hourLabel(hour.time, isFirst);
  const temp =
    hour.temperature === null || hour.temperature === undefined
      ? '—'
      : `${Math.round(hour.temperature)}°`;
  const precip =
    hour.precipitationProbability === null || hour.precipitationProbability === undefined
      ? null
      : `${Math.round(hour.precipitationProbability)}%`;

  const a11y = [label, temp, precip ? `${precip} chance of precipitation` : undefined]
    .filter(Boolean)
    .join(', ');

  return (
    <BaobabCard
      quiet
      padding={SPACING.sm}
      style={styles.cell}
      accessible
      accessibilityRole="text"
      accessibilityLabel={a11y}>
      <BrandText variant="smallBold" tone="textSecondary">
        {label}
      </BrandText>
      <WeatherIcon code={hour.weatherCode} isDay={hour.isDay} variant="title" />
      <BrandText variant="monoLarge" tone="text">
        {temp}
      </BrandText>
      <BrandText variant="caption" tone={precip ? 'primary' : 'textTertiary'}>
        {precip ? `💧 ${precip}` : '—'}
      </BrandText>
    </BaobabCard>
  );
}

export function HourlyForecast({ hours }: { hours: HourlyPoint[] }) {
  if (hours.length === 0) return null;
  return (
    <View>
      <SectionHeading>24-hour forecast</SectionHeading>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.track}
        accessibilityRole="list">
        {hours.map((hour, index) => (
          <HourCell key={`${hour.time}-${index}`} hour={hour} isFirst={index === 0} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  cell: {
    minWidth: 68,
    alignItems: 'center',
    gap: SPACING.xs,
  },
});
