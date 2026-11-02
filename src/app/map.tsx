/**
 * The weather map's place for now: the bar's Map button and the menu land
 * here. The real map (layers, timeline, as the web's `/[location]/map`) needs
 * map tile routes on the API first (#55), so this says so plainly and offers
 * the way back. No dead end, no fake map.
 */

import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MapIcon } from "@/components/shell/ShellIcons";
import { BackControl } from "@/components/weather/WeatherPage";
import { WxText } from "@/components/weather/WxText";
import { usePageColors } from "@/hooks/usePageColors";
import { displayNameFromSlug, isLocationSlug } from "@/shared/current-slug";
import { RADIUS, SIZE, SPACE, TOUCH } from "@/theme/mzizi";
import { NEUTRAL_SKY, SKY_FG, skyStops } from "@/theme/sky";

export default function MapPlaceholder() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const insets = useSafeAreaInsets();
  const { dark } = usePageColors();
  const place = isLocationSlug(slug) ? displayNameFromSlug(slug) : null;
  const sky = skyStops(NEUTRAL_SKY, dark);

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: sky.top,
          paddingTop: insets.top + SPACE.snug,
          paddingBottom: insets.bottom + SPACE.section,
        },
      ]}
    >
      <View style={styles.top}>
        <BackControl />
      </View>
      <View style={styles.body} testID="map-placeholder">
        <MapIcon size={SIZE.dialMax / 4} color={SKY_FG} />
        <WxText
          type="h4"
          weight={600}
          family="serif"
          align="center"
          color={SKY_FG}
          accessibilityRole="header"
        >
          {place
            ? `The map for ${place} is coming`
            : "The weather map is coming"}
        </WxText>
        <WxText type="body" align="center" color={SKY_FG}>
          Rain, wind, cloud and air quality on a map, as on the website. It
          arrives once our weather service serves the map tiles.
        </WxText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to the weather"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
          style={[styles.button, { backgroundColor: SKY_FG }]}
        >
          <WxText type="bodyLg" weight={600} color={sky.top}>
            Back to the weather
          </WxText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: SPACE.gutter },
  top: { flexDirection: "row" },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACE.stack,
  },
  button: {
    minHeight: TOUCH.default,
    paddingHorizontal: SIZE.pillPadX,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACE.snug,
  },
});
