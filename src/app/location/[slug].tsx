/**
 * Location detail screen — same shape as the Weather home tab, but driven
 * by a slug from the route params instead of GPS.
 */

import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; weather: WeatherResponse }
  | { kind: 'error'; message: string };

export default function LocationScreen() {
  const palette = usePalette();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    try {
      const weather = await fetchWeather({ slug });
      setState({ kind: 'ready', weather });
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Unable to load weather',
      });
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const title = state.kind === 'ready' ? (state.weather.location?.name ?? slug) : slug;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <Stack.Screen options={{ title: title ?? 'Location' }} />
      <Header title={title ?? 'Location'} subtitle={state.kind === 'ready' ? state.weather.location?.country : undefined} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />
        }>
        {state.kind === 'loading' ? (
          <View style={styles.center}>
            <ActivityIndicator color={palette.primary} />
          </View>
        ) : state.kind === 'error' ? (
          <View style={styles.center}>
            <BrandText variant="bodyBold" tone="terracotta">
              {state.message}
            </BrandText>
          </View>
        ) : (
          <>
            <View style={styles.heroBlock}>
              <WeatherIcon code={state.weather.current.weatherCode} variant="hero" />
              <BrandText variant="hero" tone="text">
                {state.weather.current.temperature !== null && state.weather.current.temperature !== undefined
                  ? `${Math.round(state.weather.current.temperature)}°`
                  : '—'}
              </BrandText>
              {state.weather.current.description ? (
                <BrandText variant="subtitle" tone="textSecondary">
                  {state.weather.current.description}
                </BrandText>
              ) : null}
            </View>

            <View style={styles.metricGrid}>
              <MetricCard label="Humidity" value={state.weather.current.humidity} unit="%" />
              <MetricCard label="Wind" value={state.weather.current.windSpeed} unit="km/h" />
            </View>

            <BrandText variant="subtitle" tone="text" style={styles.heading}>
              7-day forecast
            </BrandText>
            <View style={styles.dailyList}>
              {state.weather.daily.slice(0, 7).map((d, idx) => {
                const date = d.date ? new Date(d.date) : null;
                const label = date
                  ? date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })
                  : '—';
                return (
                  <View key={d.date ?? idx} style={[styles.dailyRow, { borderColor: palette.border }]}>
                    <View style={styles.dailyLeft}>
                      <WeatherIcon code={d.weatherCode} variant="title" />
                      <BrandText variant="bodyBold" tone="text">
                        {label}
                      </BrandText>
                    </View>
                    <View style={styles.dailyRight}>
                      <BrandText variant="mono" tone="textSecondary">
                        {d.tempMin !== null && d.tempMin !== undefined ? `${Math.round(d.tempMin)}°` : '—'}
                      </BrandText>
                      <BrandText variant="monoLarge" tone="text">
                        {d.tempMax !== null && d.tempMax !== undefined ? `${Math.round(d.tempMax)}°` : '—'}
                      </BrandText>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: SPACING.md, gap: SPACING.md },
  center: { paddingVertical: SPACING.xxl, alignItems: 'center', gap: SPACING.sm },
  heroBlock: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.xs },
  metricGrid: { flexDirection: 'row', gap: SPACING.sm },
  heading: { marginTop: SPACING.md },
  dailyList: { gap: SPACING.xs },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dailyLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dailyRight: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.sm },
});
