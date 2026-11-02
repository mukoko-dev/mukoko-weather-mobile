/**
 * Locations — the iOS Weather-style list (the web's `/locations`): My
 * Location first, then every saved place as a live weather card, in the same
 * order the bottom bar's lane and the swipe walk. A card opens the place; a
 * saved card's ⋯ sets it as Home or removes it (the native action sheet on
 * iOS, a dialog on Android). The search field opens My Weather, where places
 * are found and saved, as the web's opens My Weather's Location tab.
 */

import * as Location from "expo-location";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { geoLookup } from "@/api/locations";
import { fetchWeather, type WeatherResponse } from "@/api/weather";
import { SearchIcon } from "@/components/icons/Icon";
import { MukokoLogo } from "@/components/MukokoLogo";
import { LocationWeatherCard } from "@/components/shell/LocationWeatherCard";
import { WxText } from "@/components/weather/WxText";
import { useNow } from "@/hooks/useNow";
import { usePageColors } from "@/hooks/usePageColors";
import { MY_LOCATION_NAME } from "@/shared/location-pager";
import {
  CARD_FETCH_CONCURRENCY,
  buildLocationList,
  mapWithConcurrency,
  summarizeCard,
} from "@/shell/location-card";
import { applyMove, pageMove } from "@/shell/navigate";
import { setHomeLocation, useHomeLocation } from "@/state/home-location";
import {
  MAX_SAVED_LOCATIONS,
  removeSavedLocation,
  usePreferences,
} from "@/state/preferences";
import { BORDER, RADIUS, SIZE, SPACE, TOUCH } from "@/theme/mzizi";

type Loaded = Record<string, WeatherResponse | null>;

/** The key a card's weather is stored under: the slug, or "" for My Location. */
const HERE = "";

export default function LocationsScreen() {
  const { colors } = usePageColors();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const { savedLocations } = usePreferences();
  const home = useHomeLocation();
  const [weather, setWeather] = useState<Loaded>({});
  const [hereName, setHereName] = useState<string | null>(null);

  const entries = useMemo(
    () =>
      buildLocationList(
        savedLocations.map((l) => l.slug),
        MAX_SAVED_LOCATIONS,
      ),
    [savedLocations],
  );
  const slugKey = entries.map((e) => e.slug ?? HERE).join(",");

  // Saved places: a few requests at a time, each card filling as it lands.
  useEffect(() => {
    const controller = new AbortController();
    const slugs = slugKey.split(",").filter((s) => s !== HERE);
    void mapWithConcurrency(slugs, CARD_FETCH_CONCURRENCY, async (slug) => {
      let value: WeatherResponse | null = null;
      try {
        value = await fetchWeather({ slug }, controller.signal);
      } catch {
        value = null;
      }
      if (!controller.signal.aborted) {
        setWeather((prev) => ({ ...prev, [slug]: value }));
      }
    });
    return () => controller.abort();
  }, [slugKey]);

  // My Location: only with permission already given (never prompts here).
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") {
          setWeather((prev) => ({ ...prev, [HERE]: null }));
          return;
        }
        const pos =
          (await Location.getLastKnownPositionAsync()) ??
          (await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }));
        const { latitude: lat, longitude: lon } = pos.coords;
        const [w, geo] = await Promise.all([
          fetchWeather({ lat, lon }, controller.signal),
          geoLookup(lat, lon, true, controller.signal).catch(() => null),
        ]);
        if (controller.signal.aborted) return;
        setWeather((prev) => ({ ...prev, [HERE]: w }));
        setHereName(geo?.location?.name ?? w.location?.name ?? null);
      } catch {
        if (!controller.signal.aborted) {
          setWeather((prev) => ({ ...prev, [HERE]: null }));
        }
      }
    })();
    return () => controller.abort();
  }, []);

  const open = useCallback((slug: string | null) => {
    applyMove(router, pageMove("/locations", slug ? `/${slug}` : "/"));
  }, []);

  const showActions = useCallback(
    (slug: string, name: string) => {
      const isHome = home === slug;
      const homeLabel = isHome ? "Remove as Home" : "Set as Home";
      const toggleHome = () => setHomeLocation(isHome ? null : slug);
      const remove = () => {
        removeSavedLocation(slug);
        if (isHome) setHomeLocation(null);
      };
      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: name,
            options: [homeLabel, "Remove from Locations", "Cancel"],
            destructiveButtonIndex: 1,
            cancelButtonIndex: 2,
          },
          (i) => {
            if (i === 0) toggleHome();
            if (i === 1) remove();
          },
        );
        return;
      }
      Alert.alert(name, undefined, [
        { text: homeLabel, onPress: toggleHome },
        { text: "Remove", style: "destructive", onPress: remove },
        { text: "Cancel", style: "cancel" },
      ]);
    },
    [home],
  );

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.body,
        { paddingTop: insets.top + SPACE.snug },
      ]}
    >
      <View style={styles.head}>
        <MukokoLogo size={28} />
      </View>
      <WxText
        type="h4"
        weight={600}
        family="serif"
        color={colors.textPrimary}
        accessibilityRole="header"
      >
        Locations
      </WxText>
      <Pressable
        accessibilityRole="search"
        accessibilityLabel="Search for a city or place"
        accessibilityHint="Opens My Weather to find and save places"
        onPress={() => router.navigate("/my")}
        style={[
          styles.search,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        testID="locations-search"
      >
        <SearchIcon size={SIZE.iconMd} color={colors.textTertiary} />
        <WxText type="body" color={colors.textTertiary}>
          Search for a city or place
        </WxText>
      </Pressable>

      {entries.map((entry) => {
        const key = entry.slug ?? HERE;
        const loaded = key in weather;
        const w = weather[key] ?? null;
        const saved = savedLocations.find((l) => l.slug === entry.slug);
        const name = entry.isCurrent
          ? (hereName ?? MY_LOCATION_NAME)
          : (saved?.name ?? key);
        return (
          <LocationWeatherCard
            key={key || "here"}
            name={name}
            summary={summarizeCard(w, now)}
            loading={!loaded}
            isCurrent={entry.isCurrent}
            isHome={entry.slug !== null && entry.slug === home}
            onPress={() => open(entry.slug)}
            onMore={
              entry.slug ? () => showActions(entry.slug!, name) : undefined
            }
            testID={`location-card-${key || "here"}`}
          />
        );
      })}

      {savedLocations.length === 0 ? (
        <WxText type="body" color={colors.textSecondary} align="center">
          Places you save show here, and in the bar at the bottom, so you can
          swipe between them.
        </WxText>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: SPACE.gutter,
    paddingBottom: SPACE.section,
    gap: SPACE.stack,
  },
  head: { flexDirection: "row", alignItems: "center" },
  search: {
    minHeight: TOUCH.min,
    borderRadius: RADIUS.input,
    borderWidth: BORDER.rest,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.snug,
    paddingHorizontal: SPACE.card,
  },
});
