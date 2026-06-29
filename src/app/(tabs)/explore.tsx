/**
 * Explore tab — search/add a location.
 *
 * Type a city name; we call /api/py/locations/add { query } which returns
 * either the resolved location (when there's a single confident hit) or a
 * list of candidates. Tapping a candidate navigates to /location/[slug] and
 * the weather screen takes over.
 */

import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { addLocation, type LocationSummary } from '@/api/locations';
import { RADIUS, SPACING } from '@/brand/tokens';
import { BrandText } from '@/components/BrandText';
import { Header } from '@/components/Header';
import { usePalette } from '@/hooks/usePalette';

export default function ExploreScreen() {
  const palette = usePalette();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<LocationSummary[]>([]);

  const onSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const res = await addLocation({ query: trimmed });
      const candidates = res.candidates && res.candidates.length > 0 ? res.candidates : [res.location];
      setResults(candidates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [query]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <Header title="Explore" subtitle="Find or add a location" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View
          style={[
            styles.searchRow,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={onSearch}
            placeholder="Search any city or town"
            placeholderTextColor={palette.textTertiary}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="search"
            style={[styles.input, { color: palette.text }]}
          />
          <Pressable
            onPress={onSearch}
            accessibilityRole="button"
            style={[styles.searchBtn, { backgroundColor: palette.primary }]}>
            <BrandText variant="bodyBold" tone="textInverse">
              Search
            </BrandText>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={palette.primary} />
          </View>
        ) : null}

        {error ? (
          <BrandText variant="small" tone="terracotta">
            {error}
          </BrandText>
        ) : null}

        {results.map((loc) => (
          <Pressable
            key={loc.slug}
            onPress={() => router.push(`/location/${loc.slug}`)}
            style={[styles.resultRow, { backgroundColor: palette.surface, borderColor: palette.border }]}
            accessibilityRole="link"
            accessibilityLabel={`Open weather for ${loc.name}`}>
            <View style={{ flexShrink: 1 }}>
              <BrandText variant="bodyBold" tone="text">
                {loc.name}
              </BrandText>
              <BrandText variant="small" tone="textSecondary">
                {[loc.province, loc.country].filter(Boolean).join(' · ')}
              </BrandText>
            </View>
            <BrandText variant="bodyBold" tone="primary">
              ›
            </BrandText>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: SPACING.sm,
  },
  searchBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.button,
  },
  center: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 64,
  },
});
