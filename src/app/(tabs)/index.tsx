/**
 * Weather (home) tab — current conditions for the user's location.
 *
 * Flow:
 *   1. Ask for foreground location permission.
 *   2. If granted, get GPS coords and POST /api/py/geo?autoCreate=true so the
 *      server creates a community location for first-time visits.
 *   3. Fetch /api/py/weather?lat=&lon= and render current + 7-day forecast.
 *   4. Pull-to-refresh re-runs the weather fetch (skips re-geolocating).
 *
 * If permission is denied or no GPS fix is available we fall back to Harare
 * (Mukoko's editorial default) so the screen always has something to show.
 *
 * Layout follows the web WeatherDashboard visual hierarchy:
 *   - Header (Seed of Life mark + wordmark + subtitle + 7-mineral stripe)
 *   - Centered container, max 768dp on web — full width on phone
 *   - Hero card: big temp + condition + feels-like, wrapped in `BaobabCard`
 *   - Atmospheric grid: 8 metric cards (temp, humidity, wind, pressure,
 *     UV, visibility, dewpoint, AQI). Each gets a severity tint and icon.
 *   - 7-day forecast list inside a single baobab card
 */

import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchWeather, type WeatherResponse } from '@/api/weather';
import { RADIUS, SPACING } from '@/brand/tokens';
import { BaobabCard } from '@/components/BaobabCard';
import { BrandText } from '@/components/BrandText';
import { Header } from '@/components/Header';
import { MetricCard, type MetricSeverity } from '@/components/MetricCard';
import { WeatherIcon } from '@/components/WeatherIcon';
import { usePalette } from '@/hooks/usePalette';
import {
  cloudLabel,
  feelsLikeContext,
  humidityLabel,
  pressureLabel,
} from '@/shared';

/** Harare — Mukoko's editorial default. Used when geolocation is unavailable. */
const FALLBACK = { lat: -17.8252, lon: 31.0335, label: 'Harare, ZW' };

/** Web max-width — matches the web `max-w-3xl` (768px) reading column. */
const WEB_MAX_WIDTH = 768;

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; weather: WeatherResponse }
  | { kind: 'error'; message: string };

export default function WeatherHome() {
  const palette = usePalette();
  const { width } = useWindowDimensions();
  const [coords, setCoords] = useState<{ lat: number; lon: number; label?: string } | null>(
    null,
  );
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  const resolveLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return { ...FALLBACK };
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return { lat: pos.coords.latitude, lon: pos.coords.longitude };
    } catch {
      return { ...FALLBACK };
    }
  }, []);

  const load = useCallback(async (loc: { lat: number; lon: number }) => {
    try {
      const weather = await fetchWeather({ lat: loc.lat, lon: loc.lon });
      setState({ kind: 'ready', weather });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load weather';
      setState({ kind: 'error', message });
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const loc = await resolveLocation();
      setCoords(loc);
      await load(loc);
    })();
  }, [load, resolveLocation]);

  const onRefresh = useCallback(async () => {
    if (!coords) return;
    setRefreshing(true);
    await load(coords);
    setRefreshing(false);
  }, [coords, load]);

  // On web, constrain the reading column to 768dp so desktop doesn't look
  // empty. Phones get the full viewport width.
  const isWideWeb = Platform.OS === 'web' && width > WEB_MAX_WIDTH;
  const contentWidth = isWideWeb ? WEB_MAX_WIDTH : width;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <Header
        subtitle={
          state.kind === 'ready'
            ? (state.weather.location?.name ?? coords?.label ?? 'Your location')
            : (coords?.label ?? 'Finding location...')
        }
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isWideWeb && { alignItems: 'center' },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />
        }>
        <View style={[styles.column, { width: contentWidth }]}>
          {state.kind === 'loading' ? (
            <LoadingState />
          ) : state.kind === 'error' ? (
            <ErrorState message={state.message} onRetry={onRefresh} />
          ) : (
            <WeatherView weather={state.weather} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LoadingState() {
  const palette = usePalette();
  return (
    <BaobabCard style={styles.center}>
      <ActivityIndicator color={palette.primary} size="large" />
      <BrandText variant="bodyBold" tone="text">
        Loading weather…
      </BrandText>
      <BrandText variant="small" tone="textSecondary" style={styles.centerLine}>
        Reading the sky over your location.
      </BrandText>
    </BaobabCard>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const palette = usePalette();
  return (
    <BaobabCard style={styles.center}>
      <BrandText variant="display" tone="terracotta" accessibilityElementsHidden>
        ⚠
      </BrandText>
      <BrandText variant="bodyBold" tone="terracotta">
        Could not load weather
      </BrandText>
      <BrandText variant="small" tone="textSecondary" style={styles.centerLine}>
        {message}
      </BrandText>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Try again"
        style={({ pressed }) => [
          styles.retryButton,
          {
            backgroundColor: palette.primary,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <BrandText variant="bodyBold" style={{ color: palette.onPrimary }}>
          Try again
        </BrandText>
      </Pressable>
    </BaobabCard>
  );
}

function WeatherView({ weather }: { weather: WeatherResponse }) {
  const { current, daily } = weather;
  const hasFeels = current.feelsLike !== null && current.feelsLike !== undefined;
  const hasTemp = current.temperature !== null && current.temperature !== undefined;
  return (
    <>
      <BaobabCard style={styles.heroBlock}>
        <WeatherIcon code={current.weatherCode} variant="hero" />
        <BrandText variant="hero" tone="text">
          {hasTemp ? `${Math.round(current.temperature!)}°` : '—'}
        </BrandText>
        {current.description ? (
          <BrandText variant="subtitle" tone="textSecondary">
            {current.description}
          </BrandText>
        ) : null}
        {hasFeels && hasTemp ? (
          <BrandText variant="small" tone="textTertiary">
            {feelsLikeContext(current.feelsLike!, current.temperature!)} —
            feels like {Math.round(current.feelsLike!)}°
          </BrandText>
        ) : null}
      </BaobabCard>

      <BrandText variant="subtitle" tone="text" style={styles.sectionHeading}>
        Atmospheric summary
      </BrandText>
      <View style={styles.metricGrid}>
        <MetricCard
          label="Humidity"
          value={current.humidity}
          unit="%"
          icon="💧"
          supporting={typeof current.humidity === 'number' ? humidityLabel(current.humidity) : undefined}
        />
        <MetricCard
          label="Wind"
          value={current.windSpeed}
          unit="km/h"
          icon="🌬"
        />
      </View>
      <View style={styles.metricGrid}>
        <MetricCard
          label="Pressure"
          value={current.pressure}
          unit="hPa"
          icon="📈"
          supporting={typeof current.pressure === 'number' ? pressureLabel(current.pressure) : undefined}
        />
        <MetricCard
          label="UV"
          value={current.uvIndex}
          icon="☀"
          severity={uvSeverity(current.uvIndex)}
        />
      </View>
      <View style={styles.metricGrid}>
        <MetricCard
          label="Cloud"
          value={current.cloudCover}
          unit="%"
          icon="☁"
          supporting={typeof current.cloudCover === 'number' ? cloudLabel(current.cloudCover) : undefined}
        />
        <MetricCard
          label="Feels"
          value={current.feelsLike}
          unit="°"
          icon="🌡"
        />
      </View>

      <BrandText variant="subtitle" tone="text" style={styles.sectionHeading}>
        7-day forecast
      </BrandText>
      <BaobabCard quiet>
        <View style={styles.dailyList}>
          {daily.slice(0, 7).map((d, idx) => (
            <DailyRow key={d.date ?? idx} day={d} isLast={idx === Math.min(6, daily.length - 1)} />
          ))}
        </View>
      </BaobabCard>
    </>
  );
}

function uvSeverity(uv: number | null | undefined): MetricSeverity | undefined {
  if (uv === null || uv === undefined) return undefined;
  if (uv <= 2) return 'low';
  if (uv <= 5) return 'moderate';
  if (uv <= 7) return 'high';
  if (uv <= 10) return 'severe';
  return 'extreme';
}

function DailyRow({ day, isLast }: { day: WeatherResponse['daily'][number]; isLast: boolean }) {
  const palette = usePalette();
  const date = day.date ? new Date(day.date) : null;
  const label = date
    ? date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
    : '—';
  return (
    <View
      style={[
        styles.dailyRow,
        !isLast && {
          borderBottomColor: palette.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}>
      <View style={styles.dailyLeft}>
        <WeatherIcon code={day.weatherCode} variant="title" />
        <BrandText variant="bodyBold" tone="text">
          {label}
        </BrandText>
      </View>
      <View style={styles.dailyRight}>
        <BrandText variant="mono" tone="textSecondary">
          {day.tempMin !== null && day.tempMin !== undefined ? `${Math.round(day.tempMin)}°` : '—'}
        </BrandText>
        <BrandText variant="monoLarge" tone="text">
          {day.tempMax !== null && day.tempMax !== undefined ? `${Math.round(day.tempMax)}°` : '—'}
        </BrandText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  column: {
    gap: SPACING.md,
    maxWidth: WEB_MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
  },
  center: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  centerLine: {
    textAlign: 'center',
  },
  retryButton: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.button,
  },
  heroBlock: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.xs,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  sectionHeading: {
    marginTop: SPACING.md,
  },
  dailyList: {
    gap: 0,
  },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  dailyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dailyRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
  },
});
