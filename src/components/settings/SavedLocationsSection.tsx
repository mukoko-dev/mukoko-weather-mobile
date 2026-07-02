/**
 * SavedLocationsSection — the pinned-locations block of the "My" screen.
 *
 *   - Lists saved locations (up to MAX_SAVED_LOCATIONS); tap a row to open its
 *     forecast at /location/[slug]; the trash affordance removes it.
 *   - "Use my current location" requests foreground location permission, reads
 *     GPS, and resolves it against /api/py/geo (autoCreate) via the shared API
 *     client. The backend now creates fine-grained locations (roads / shops),
 *     so we surface the specific returned name.
 *   - A search field queries the shared location index; tapping a result pins
 *     it. Adds respect the 10-location cap and de-duplicate by slug.
 */

import { router } from "expo-router";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ApiError } from "@/api/client";
import {
  geoLookup,
  searchLocations,
  type LocationSummary,
} from "@/api/locations";
import { RADIUS, SPACING, TOUCH_TARGET_MIN } from "@/brand/tokens";
import { BrandText } from "@/components/BrandText";
import { usePalette } from "@/hooks/usePalette";
import {
  addSavedLocation,
  MAX_SAVED_LOCATIONS,
  removeSavedLocation,
  usePreferences,
  type SavedLocation,
} from "@/state/preferences";

/** Compose "Province, Country" (or whichever parts are present). */
function subtitleFor(loc: {
  province?: string;
  country?: string;
}): string | undefined {
  return [loc.province, loc.country].filter(Boolean).join(", ") || undefined;
}

export function SavedLocationsSection() {
  const palette = usePalette();
  const { savedLocations } = usePreferences();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const atCapacity = savedLocations.length >= MAX_SAVED_LOCATIONS;

  // Debounced search — all setState happens inside the timer / async callbacks
  // (never synchronously in the effect body) to satisfy react-hooks rules.
  useEffect(() => {
    const q = query.trim();
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (q.length < 2) {
        setResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      searchLocations(q, controller.signal)
        .then((res) => setResults(res.results.slice(0, 6)))
        .catch(() => {
          if (!controller.signal.aborted) setResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const pin = useCallback((loc: SavedLocation): boolean => {
    const result = addSavedLocation(loc);
    if (result === "full") {
      setNotice(`You can save up to ${MAX_SAVED_LOCATIONS} locations.`);
      return false;
    }
    if (result === "duplicate") {
      setNotice(`${loc.name} is already saved.`);
      return true;
    }
    setNotice(null);
    return true;
  }, []);

  const onAddResult = useCallback(
    (loc: LocationSummary) => {
      const ok = pin({
        slug: loc.slug,
        name: loc.name,
        province: loc.province,
        country: loc.country,
      });
      if (ok) {
        setQuery("");
        setResults([]);
      }
    },
    [pin],
  );

  const onUseCurrentLocation = useCallback(async () => {
    setLocating(true);
    setNotice(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setNotice("Location permission is needed to detect your position.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { location } = await geoLookup(
        pos.coords.latitude,
        pos.coords.longitude,
        true,
      );
      if (!location) {
        setNotice("We could not match your position to a location.");
        return;
      }
      pin({
        slug: location.slug,
        name: location.name,
        province: location.province,
        country: location.country,
      });
      router.push(`/location/${location.slug}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setNotice("Too many location lookups. Please try again shortly.");
      } else {
        setNotice("Could not detect your location. Please try again.");
      }
    } finally {
      setLocating(false);
    }
  }, [pin]);

  return (
    <View style={styles.wrap}>
      {savedLocations.length === 0 ? (
        <BrandText variant="body" tone="textSecondary">
          No saved locations yet. Search below or use your current location to
          pin one.
        </BrandText>
      ) : (
        <View style={styles.list}>
          {savedLocations.map((loc) => {
            const sub = subtitleFor(loc);
            return (
              <View
                key={loc.slug}
                style={[styles.row, { borderColor: palette.border }]}
              >
                <Pressable
                  style={styles.rowMain}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${loc.name} forecast`}
                  onPress={() => router.push(`/location/${loc.slug}`)}
                >
                  <BrandText variant="bodyBold" tone="text" numberOfLines={1}>
                    {loc.name}
                  </BrandText>
                  {sub ? (
                    <BrandText
                      variant="caption"
                      tone="textTertiary"
                      numberOfLines={1}
                    >
                      {sub}
                    </BrandText>
                  ) : null}
                </Pressable>
                <Pressable
                  style={styles.remove}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${loc.name}`}
                  onPress={() => removeSavedLocation(loc.slug)}
                >
                  <BrandText variant="bodyBold" tone="textTertiary">
                    ✕
                  </BrandText>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <Pressable
        onPress={onUseCurrentLocation}
        disabled={locating || atCapacity}
        accessibilityRole="button"
        accessibilityState={{ disabled: locating || atCapacity }}
        accessibilityLabel="Use my current location"
        style={[
          styles.currentBtn,
          { borderColor: palette.primary },
          (locating || atCapacity) && styles.disabled,
        ]}
      >
        {locating ? (
          <ActivityIndicator color={palette.primary} />
        ) : (
          <BrandText variant="bodyBold" tone="primary">
            Use my current location
          </BrandText>
        )}
      </Pressable>

      {!atCapacity ? (
        <View style={styles.searchBlock}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search to add a location"
            placeholderTextColor={palette.textTertiary}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search to add a location"
            style={[
              styles.input,
              {
                color: palette.text,
                borderColor: palette.border,
                backgroundColor: palette.surfaceDim,
              },
            ]}
          />
          {searching ? (
            <ActivityIndicator
              style={styles.searchSpinner}
              color={palette.primary}
            />
          ) : null}
          {results.length > 0 ? (
            <View style={styles.results}>
              {results.map((loc) => {
                const sub = subtitleFor(loc);
                return (
                  <Pressable
                    key={loc.slug}
                    onPress={() => onAddResult(loc)}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${loc.name}`}
                    style={[styles.resultRow, { borderColor: palette.border }]}
                  >
                    <View style={styles.resultText}>
                      <BrandText variant="body" tone="text" numberOfLines={1}>
                        {loc.name}
                      </BrandText>
                      {sub ? (
                        <BrandText
                          variant="caption"
                          tone="textTertiary"
                          numberOfLines={1}
                        >
                          {sub}
                        </BrandText>
                      ) : null}
                    </View>
                    <BrandText variant="bodyBold" tone="primary">
                      +
                    </BrandText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}

      {notice ? (
        <BrandText variant="small" tone="terracotta">
          {notice}
        </BrandText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.sm },
  list: { gap: SPACING.xs },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: TOUCH_TARGET_MIN,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowMain: { flex: 1, paddingVertical: SPACING.sm, gap: 2 },
  remove: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  currentBtn: {
    minHeight: TOUCH_TARGET_MIN,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.button,
    borderWidth: 1.5,
    paddingHorizontal: SPACING.md,
  },
  disabled: { opacity: 0.5 },
  searchBlock: { gap: SPACING.xs },
  input: {
    minHeight: TOUCH_TARGET_MIN,
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.md,
    fontFamily: "NotoSans_400Regular",
    fontSize: 16,
  },
  searchSpinner: { alignSelf: "center" },
  results: { gap: SPACING.xs, marginTop: SPACING.xs },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: TOUCH_TARGET_MIN,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  resultText: { flex: 1, paddingVertical: SPACING.sm, gap: 2 },
});
