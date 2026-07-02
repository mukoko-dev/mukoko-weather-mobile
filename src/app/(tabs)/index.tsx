/**
 * Weather (home) tab — current conditions for the user's location.
 *
 * Flow:
 *   1. Ask for foreground location permission.
 *   2. If granted, get a fine-grained GPS fix (High accuracy) and resolve the
 *      specific place name via GET /api/py/geo?lat=&lon=&autoCreate=true (the
 *      backend reverse-geocodes to road/shop/suburb level and creates a
 *      community location on first visit).
 *   3. Fetch /api/py/weather?lat=&lon= and render hourly + current + 7-day.
 *   4. Pull-to-refresh re-runs the weather fetch (skips re-geolocating).
 *
 * If permission is denied or no GPS fix is available we fall back to Harare
 * (Mukoko's editorial default) so the screen always has something to show.
 *
 * Layout follows the web WeatherDashboard visual hierarchy:
 *   - Header (Seed of Life mark + wordmark + subtitle + 7-mineral stripe)
 *   - Centered container, max 768dp on web — full width on phone
 *   - Condition hero: big temp + condition + feels-like over a subtle,
 *     weather-code-driven animated background (`ConditionHero`)
 *   - Hourly strip: horizontal 24h forecast (`HourlyStrip`)
 *   - Atmospheric grid: metric cards. Each gets a severity tint and icon.
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

import { type LocationSummary, geoLookup } from '@/api/locations';
import { fetchWeather, type WeatherResponse } from '@/api/weather';
import { RADIUS, SPACING } from '@/brand/tokens';
import { BaobabCard } from '@/components/BaobabCard';
import { BrandText } from '@/components/BrandText';
import { Header } from '@/components/Header';
import { ConditionHero } from '@/components/home/ConditionHero';
import { HourlyStrip } from '@/components/home/HourlyStrip';
import { isDaytime } from '@/components/home/hourly';
import { MetricCard, type MetricSeverity } from '@/components/MetricCard';
import { WeatherIcon } from '@/components/WeatherIcon';
import { usePalette } from '@/hooks/usePalette';
import { cloudLabel, humidityLabel, pressureLabel } from '@/shared';

/** Harare — Mukoko's editorial default. Used when geolocation is unavailable. */
const FALLBACK = { lat: -17.8252, lon: 31.0335, label: 'Harare, ZW' };

/** Web max-width — matches the web `max-w-3xl` (768px) reading column. */
const WEB_MAX_WIDTH = 768;

type Coords = { lat: number; lon: number; label?: string };

/**
 * `/api/py/geo` response. The read-only `geoLookup` helper types the payload
 * as `{ location }`, but the current backend returns the resolved place under
 * `nearest` (with `redirectTo`/`isNew`). Read both defensively.
 */
type GeoResult = {
  location?: LocationSummary | null;
  nearest?: LocationSummary | null;
};

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; weather: WeatherResponse }
  | { kind: 'error'; message: string };

export default function WeatherHome() {
  const palette = usePalette();
  const { width } = useWindowDimensions();
  const [coords, setCoords] = useState<Coords | null>(null);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  const resolveLocation = useCallback(async (): Promise<Coords> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return { ...FALLBACK };
      }
      // High accuracy so the backend can reverse-geocode to a specific
      // road / shop / suburb rather than the nearest city centroid.
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return { lat: pos.coords.latitude, lon: pos.coords.longitude };
    } catch {
      return { ...FALLBACK };
    }
  }, []);

  /** Resolve (and auto-create) the fine-grained place name for a GPS fix. */
  const resolveName = useCallback(async (loc: Coords): Promise<string | null> => {
    try {
      const res = (await geoLookup(loc.lat, loc.lon, true)) as unknown as GeoResult;
      return res.nearest?.name ?? res.location?.name ?? null;
    } catch {
      return null;
    }
  }, []);

  const load = useCallback(async (loc: Coords) => {
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
      // Kick off the weather fetch immediately; resolve the specific place
      // name in parallel so a slow geocode never blocks first paint.
      void load(loc);
      if (loc.label) return; // fallback (Harare) already has a label
      const name = await resolveName(loc);
      if (name) {
        setCoords((prev) => ({ ...(prev ?? loc), label: name }));
      }
    })();
  }, [load, resolveLocation, resolveName]);

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

  // Prefer the fine-grained geolocated name; fall back to the weather API's
  // resolved location, then a neutral placeholder.
  const subtitle =
    coords?.label ??
    (state.kind === 'ready' ? state.weather.location?.name : undefined) ??
    'Finding location…';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <Header subtitle={subtitle} />
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
  const isDay = isDaytime(new Date());
  return (
    <>
      <ConditionHero current={current} isDay={isDay} />

      <HourlyStrip weather={weather} />

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
