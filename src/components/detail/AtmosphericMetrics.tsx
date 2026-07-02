/**
 * Atmospheric metrics grid — humidity, wind, pressure, UV, cloud, feels-like.
 *
 * Two metric cards per row (matching the home Weather tab), each a `MetricCard`
 * wrapping `BaobabCard`. Supporting lines and severity tints come from the
 * shared weather-label helpers so mobile and web phrase things identically.
 */

import { StyleSheet, View } from 'react-native';

import type { WeatherResponse } from '@/api/weather';
import { SPACING } from '@/brand/tokens';
import { MetricCard, type MetricSeverity } from '@/components/MetricCard';
import { SectionHeading } from '@/components/detail/SectionHeading';
import { cloudLabel, humidityLabel, pressureLabel, windDirection } from '@/shared';

function uvSeverity(uv: number | null | undefined): MetricSeverity | undefined {
  if (uv === null || uv === undefined) return undefined;
  if (uv <= 2) return 'low';
  if (uv <= 5) return 'moderate';
  if (uv <= 7) return 'high';
  if (uv <= 10) return 'severe';
  return 'extreme';
}

function isNum(v: number | null | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function AtmosphericMetrics({ weather }: { weather: WeatherResponse }) {
  const { current } = weather;

  const windSupporting = isNum(current.windDirection)
    ? `From ${windDirection(current.windDirection)}`
    : undefined;

  return (
    <View>
      <SectionHeading>Atmospheric conditions</SectionHeading>
      <View style={styles.grid}>
        <View style={styles.row}>
          <MetricCard
            label="Humidity"
            value={current.humidity}
            unit="%"
            icon="💧"
            supporting={isNum(current.humidity) ? humidityLabel(current.humidity) : undefined}
          />
          <MetricCard label="Wind" value={current.windSpeed} unit="km/h" icon="🌬" supporting={windSupporting} />
        </View>
        <View style={styles.row}>
          <MetricCard
            label="Pressure"
            value={current.pressure}
            unit="hPa"
            icon="📈"
            supporting={isNum(current.pressure) ? pressureLabel(current.pressure) : undefined}
          />
          <MetricCard label="UV index" value={current.uvIndex} icon="☀" severity={uvSeverity(current.uvIndex)} />
        </View>
        <View style={styles.row}>
          <MetricCard
            label="Cloud"
            value={current.cloudCover}
            unit="%"
            icon="☁"
            supporting={isNum(current.cloudCover) ? cloudLabel(current.cloudCover) : undefined}
          />
          <MetricCard label="Feels like" value={current.feelsLike} unit="°" icon="🌡" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
});
