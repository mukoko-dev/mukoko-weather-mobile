/**
 * HourlyStrip — a horizontal 24-hour forecast: one compact cell per hour
 * showing time, condition glyph, temperature and (when available) rain
 * probability. Sits directly under the hero, mirroring the web app's
 * `HourlyForecast`.
 *
 * Reads already-fetched hourly data from the weather response via
 * `extractHourly`; renders nothing if the provider returned no hourly block
 * (e.g. the seasonal-estimate fallback).
 */

import { ScrollView, StyleSheet, View } from 'react-native';

import { type WeatherResponse } from '@/api/weather';
import { RADIUS, SPACING } from '@/brand/tokens';
import { BrandText } from '@/components/BrandText';
import { WeatherIcon } from '@/components/WeatherIcon';
import { usePalette } from '@/hooks/usePalette';

import { extractHourly, hourLabel, isDaytime } from './hourly';

export type HourlyStripProps = {
  weather: WeatherResponse;
};

export function HourlyStrip({ weather }: HourlyStripProps) {
  const palette = usePalette();
  const points = extractHourly(weather, 24);

  if (points.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <BrandText variant="subtitle" tone="text" style={styles.heading}>
        Next 24 hours
      </BrandText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        accessibilityRole="list">
        {points.map((p, idx) => {
          const day = isDaytime(new Date(p.time));
          const temp =
            p.temp !== null && p.temp !== undefined ? `${Math.round(p.temp)}°` : '—';
          const showPrecip = p.precipProb !== null && p.precipProb !== undefined && p.precipProb > 0;
          const label = hourLabel(p.time, idx);
          const a11y = `${label}, ${temp}${showPrecip ? `, ${Math.round(p.precipProb!)}% rain` : ''}`;
          return (
            <View
              key={p.time}
              accessibilityRole="text"
              accessibilityLabel={a11y}
              style={[
                styles.cell,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}>
              <BrandText variant="caption" tone="textSecondary">
                {label}
              </BrandText>
              <WeatherIcon code={p.weatherCode} isDay={day} variant="title" />
              <BrandText variant="mono" tone="text">
                {temp}
              </BrandText>
              <BrandText
                variant="caption"
                tone={showPrecip ? 'primary' : 'textTertiary'}
                style={styles.precip}>
                {showPrecip ? `💧 ${Math.round(p.precipProb!)}%` : ' '}
              </BrandText>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: SPACING.sm,
  },
  heading: {
    marginTop: SPACING.md,
  },
  row: {
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  cell: {
    minWidth: 64,
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  precip: {
    minHeight: 16,
  },
});
