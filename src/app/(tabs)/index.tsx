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
 */

import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchWeather, type WeatherResponse } from '@/api/weather';
import { RADIUS, SPACING } from '@/brand/tokens';
import { BrandText } from '@/components/BrandText';
import { Header } from '@/components/Header';
import { MetricCard } from '@/components/MetricCard';
import { WeatherIcon } from '@/components/WeatherIcon';
import { usePalette } from '@/hooks/usePalette';

const FALLBACK = { lat: -17.8252, lon: 31.0335, label: 'Harare, ZW' };

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; weather: WeatherResponse }
  | { kind: 'error'; message: string };

export default function WeatherHome() {
  const palette = usePalette();
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <Header
        title="mukoko"
        subtitle={
          state.kind === 'ready'
            ? (state.weather.location?.name ?? coords?.label ?? 'Your location')
            : (coords?.label ?? 'Finding location...')
        }
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />
        }>
        {state.kind === 'loading' ? (
          <View style={styles.center}>
            <ActivityIndicator color={palette.primary} />
            <BrandText variant="small" tone="textSecondary">
              Loading weather...
            </BrandText>
          </View>
        ) : state.kind === 'error' ? (
          <View style={styles.center}>
            <BrandText variant="bodyBold" tone="terracotta">
              Could not load weather
            </BrandText>
            <BrandText variant="small" tone="textSecondary">
              {state.message}
            </BrandText>
            <Pressable onPress={onRefresh}>
              <BrandText variant="bodyBold" tone="primary">
                Try again
              </BrandText>
            </Pressable>
          </View>
        ) : (
          <WeatherView weather={state.weather} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function WeatherView({ weather }: { weather: WeatherResponse }) {
  const { current, daily } = weather;
  return (
    <>
      <View style={styles.heroBlock}>
        <WeatherIcon code={current.weatherCode} variant="hero" />
        <BrandText variant="hero" tone="text">
          {current.temperature !== null && current.temperature !== undefined
            ? `${Math.round(current.temperature)}°`
            : '—'}
        </BrandText>
        {current.description ? (
          <BrandText variant="subtitle" tone="textSecondary">
            {current.description}
          </BrandText>
        ) : null}
        {current.feelsLike !== null && current.feelsLike !== undefined ? (
          <BrandText variant="small" tone="textTertiary">
            Feels like {Math.round(current.feelsLike)}°
          </BrandText>
        ) : null}
      </View>

      <View style={styles.metricGrid}>
        <MetricCard label="Humidity" value={current.humidity} unit="%" />
        <MetricCard label="Wind" value={current.windSpeed} unit="km/h" />
      </View>
      <View style={styles.metricGrid}>
        <MetricCard label="Pressure" value={current.pressure} unit="hPa" />
        <MetricCard label="UV" value={current.uvIndex} />
      </View>

      <BrandText variant="subtitle" tone="text" style={styles.sectionHeading}>
        7-day forecast
      </BrandText>
      <View style={styles.dailyList}>
        {daily.slice(0, 7).map((d, idx) => (
          <DailyRow key={d.date ?? idx} day={d} />
        ))}
      </View>
    </>
  );
}

function DailyRow({ day }: { day: WeatherResponse['daily'][number] }) {
  const palette = usePalette();
  const date = day.date ? new Date(day.date) : null;
  const label = date
    ? date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
    : '—';
  return (
    <View style={[styles.dailyRow, { borderColor: palette.border }]}>
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
  center: {
    paddingVertical: SPACING.xxl,
    alignItems: 'center',
    gap: SPACING.sm,
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
    gap: SPACING.xs,
  },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
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
