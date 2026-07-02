/**
 * Explore tab — browse + search locations.
 *
 * Two modes in one screen:
 *   - Search: a debounced query hits GET /api/py/search via `searchLocations`
 *     and renders location result cards.
 *   - Browse (empty query): category chips (mineral-coloured) and country chips
 *     filter the static `LOCATIONS` catalog, mirroring the web `/explore`.
 *
 * Tapping any result navigates to `/location/[slug]`. Loading / empty / error
 * states are surfaced; pull-to-refresh retries an active search; the entrance
 * fade respects the OS reduce-motion setting.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { searchLocations, type LocationSummary } from '@/api/locations';
import { RADIUS, SPACING, TOUCH_TARGET_MIN } from '@/brand/tokens';
import { BrandText } from '@/components/BrandText';
import { FilterChip } from '@/components/explore/FilterChip';
import { LocationCard, type LocationCardData } from '@/components/explore/LocationCard';
import {
  categoriesWithCounts,
  countriesWithCounts,
  filterLocations,
} from '@/components/explore/categories';
import { useDebouncedValue } from '@/components/explore/useDebouncedValue';
import { useReducedMotion } from '@/components/explore/useReducedMotion';
import { Header } from '@/components/Header';
import { usePalette } from '@/hooks/usePalette';

export default function ExploreScreen() {
  const palette = usePalette();
  const reducedMotion = useReducedMotion();

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 350);
  const trimmed = debouncedQuery.trim();
  const isSearching = trimmed.length > 0;

  const [results, setResults] = useState<LocationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  // Browse taxonomy is derived once from the static catalog.
  const categories = useMemo(() => categoriesWithCounts(), []);
  const countries = useMemo(() => countriesWithCounts(), []);
  const browse = useMemo(
    () => filterLocations({ tag: selectedCategory, country: selectedCountry }),
    [selectedCategory, selectedCountry],
  );

  // `loading` is toggled from the input handler (an event handler) so the
  // fetch effect below never calls setState synchronously in its body.
  const onChangeQuery = (text: string) => {
    setQuery(text);
    const willSearch = text.trim().length > 0;
    setLoading(willSearch);
    if (!willSearch) setError(null);
  };

  const clearQuery = () => onChangeQuery('');

  // Debounced search against the Python API. All state updates happen inside
  // the promise continuations, never synchronously in the effect body.
  useEffect(() => {
    const q = trimmed;
    if (!q) return;
    const controller = new AbortController();
    searchLocations(q, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setResults(res.results ?? []);
        setError(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoading(false);
        setRefreshing(false);
      });
    return () => controller.abort();
  }, [trimmed, refreshKey]);

  // Entrance fade when the displayed set changes (skipped under reduce-motion).
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(1);
      return;
    }
    opacity.setValue(0);
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [opacity, reducedMotion, isSearching, selectedCategory, selectedCountry, results]);

  const data: LocationCardData[] = isSearching ? results : browse;

  const onRefresh = () => {
    if (!isSearching) return;
    setRefreshing(true);
    setRefreshKey((key) => key + 1);
  };

  const toggleCategory = (tag: string) =>
    setSelectedCategory((current) => (current === tag ? null : tag));
  const toggleCountry = (code: string) =>
    setSelectedCountry((current) => (current === code ? null : code));

  const listHeader = (
    <View style={styles.header}>
      <View
        style={[
          styles.searchRow,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}>
        <TextInput
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Search any city or town"
          placeholderTextColor={palette.textTertiary}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search locations"
          style={[styles.input, { color: palette.text }]}
        />
        {query.length > 0 ? (
          <Pressable
            onPress={clearQuery}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={12}
            style={styles.clearBtn}>
            <BrandText variant="body" tone="textTertiary">
              {'✕'}
            </BrandText>
          </Pressable>
        ) : null}
      </View>

      {isSearching ? (
        <BrandText variant="small" tone="textSecondary" style={styles.sectionLabel}>
          {loading
            ? `Searching “${trimmed}”…`
            : `${data.length} ${data.length === 1 ? 'result' : 'results'} for “${trimmed}”`}
        </BrandText>
      ) : (
        <>
          <BrandText variant="subtitle" tone="text" style={styles.browseHeading}>
            Browse by category
          </BrandText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.chipRow}>
            <FilterChip
              label="All"
              selected={selectedCategory === null}
              onPress={() => setSelectedCategory(null)}
            />
            {categories.map((cat) => (
              <FilterChip
                key={cat.tag}
                label={cat.label}
                tone={cat.tone}
                count={cat.count}
                selected={selectedCategory === cat.tag}
                onPress={() => toggleCategory(cat.tag)}
              />
            ))}
          </ScrollView>

          <BrandText variant="subtitle" tone="text" style={styles.browseHeading}>
            Browse by country
          </BrandText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.chipRow}>
            <FilterChip
              label="All"
              selected={selectedCountry === null}
              onPress={() => setSelectedCountry(null)}
            />
            {countries.map((country) => (
              <FilterChip
                key={country.code}
                label={country.name}
                leading={country.flag}
                count={country.count}
                selected={selectedCountry === country.code}
                onPress={() => toggleCountry(country.code)}
              />
            ))}
          </ScrollView>

          <BrandText variant="small" tone="textSecondary" style={styles.sectionLabel}>
            {`${data.length} ${data.length === 1 ? 'location' : 'locations'}`}
          </BrandText>
        </>
      )}

      {loading && isSearching ? (
        <View style={styles.center}>
          <ActivityIndicator color={palette.primary} />
        </View>
      ) : null}

      {error ? (
        <View style={[styles.notice, { borderColor: palette.terracotta }]}>
          <BrandText variant="small" tone="terracotta">
            {error}
          </BrandText>
        </View>
      ) : null}
    </View>
  );

  const listEmpty =
    isSearching && !loading && !error ? (
      <View style={styles.center}>
        <BrandText variant="body" tone="textSecondary">
          No locations found. Try another search.
        </BrandText>
      </View>
    ) : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <Header title="Explore" subtitle="Browse or search locations" />
      <Animated.View style={[styles.fill, { opacity }]}>
        <FlatList
          data={data}
          keyExtractor={(item) => item.slug}
          renderItem={({ item }) => <LocationCard location={item} />}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.listContent}
          initialNumToRender={12}
          removeClippedSubviews
          refreshControl={
            isSearching ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={palette.primary}
                colors={[palette.primary]}
              />
            ) : undefined
          }
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
  listContent: {
    padding: SPACING.md,
    gap: SPACING.sm,
    paddingBottom: SPACING.xxl,
  },
  header: {
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: TOUCH_TARGET_MIN,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: SPACING.sm,
  },
  clearBtn: {
    padding: SPACING.xs,
  },
  browseHeading: {
    marginTop: SPACING.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
    paddingRight: SPACING.md,
  },
  sectionLabel: {
    marginTop: SPACING.xs,
  },
  center: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  notice: {
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
