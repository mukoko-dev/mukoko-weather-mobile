/**
 * Location detail screen — a full weather page for a saved/community location,
 * driven by a `slug` route param instead of GPS.
 *
 * Layout (mirrors the web location page's hierarchy, on the Mukoko brand kit):
 *   - Brand Header (mark + wordmark + location name / country)
 *   - Hero current conditions  → HeroConditions (BaobabCard + WeatherIcon)
 *   - 24-hour forecast          → HourlyForecast (horizontal scroll)
 *   - Atmospheric conditions    → AtmosphericMetrics (MetricCard grid)
 *   - 7-day forecast            → DailyForecast
 *
 * States: loading skeleton, error + retry, pull-to-refresh. Content fades in on
 * load unless the OS "reduce motion" preference is set (then it appears
 * instantly). All spacing/radii/colours come from brand tokens + the palette.
 */

import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Animated, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchWeather, type WeatherResponse } from '@/api/weather';
import { SPACING } from '@/brand/tokens';
import { Header } from '@/components/Header';
import { AtmosphericMetrics } from '@/components/detail/AtmosphericMetrics';
import { DailyForecast } from '@/components/detail/DailyForecast';
import { DetailError } from '@/components/detail/DetailError';
import { DetailSkeleton } from '@/components/detail/DetailSkeleton';
import { HeroConditions } from '@/components/detail/HeroConditions';
import { HourlyForecast } from '@/components/detail/HourlyForecast';
import { extractHourly } from '@/components/detail/hourly';
import { useReducedMotion } from '@/components/detail/useReducedMotion';
import { usePalette } from '@/hooks/usePalette';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; weather: WeatherResponse }
  | { kind: 'error'; message: string };

function titleCaseSlug(slug: string | undefined): string {
  if (!slug) return 'Location';
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function LocationScreen() {
  const palette = usePalette();
  const reduceMotion = useReducedMotion();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  // Never calls setState synchronously — every update lands after the awaited
  // fetch, keeping the mount effect free of the react-hooks/set-state-in-effect
  // cascade warning.
  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const weather = await fetchWeather({ slug }, signal);
        setState({ kind: 'ready', weather });
      } catch (err) {
        if (signal?.aborted) return;
        setState({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Unable to load weather',
        });
      }
    },
    [slug],
  );

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    void (async () => {
      await load(controller.signal);
    })();
    return () => controller.abort();
  }, [load, slug]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onRetry = useCallback(() => {
    setState({ kind: 'loading' });
    void load();
  }, [load]);

  const fallbackTitle = titleCaseSlug(slug);
  const title =
    state.kind === 'ready' ? (state.weather.location?.name ?? fallbackTitle) : fallbackTitle;
  const subtitle =
    state.kind === 'ready'
      ? [state.weather.location?.province, state.weather.location?.country]
          .filter(Boolean)
          .join(', ') || undefined
      : undefined;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <Stack.Screen options={{ title }} />
      <Header title={title} subtitle={subtitle} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.primary}
            colors={[palette.primary]}
          />
        }>
        {!slug ? (
          <DetailError message="No location was specified." onRetry={onRetry} />
        ) : state.kind === 'loading' ? (
          <DetailSkeleton />
        ) : state.kind === 'error' ? (
          <DetailError message={state.message} onRetry={onRetry} />
        ) : (
          <ReadyContent weather={state.weather} reduceMotion={reduceMotion} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ReadyContent({
  weather,
  reduceMotion,
}: {
  weather: WeatherResponse;
  reduceMotion: boolean;
}) {
  const [opacity] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }
    const anim = Animated.timing(opacity, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [opacity, reduceMotion]);

  const hours = extractHourly(weather);

  return (
    <Animated.View style={[styles.content, { opacity }]}>
      <HeroConditions weather={weather} />
      <HourlyForecast hours={hours} />
      <AtmosphericMetrics weather={weather} />
      <DailyForecast weather={weather} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    padding: SPACING.md,
    gap: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  content: {
    gap: SPACING.md,
  },
});
