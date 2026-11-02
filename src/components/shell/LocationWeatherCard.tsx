/**
 * One card on the Locations screen, iOS Weather style (the web's
 * `LocationWeatherCard`): the place's sky by its condition, the name with a
 * MY LOCATION or HOME eyebrow, the place's own clock and condition on the
 * left, the temperature and H/L on the right. The whole card opens the place;
 * the ⋯ button opens its actions. White text sits on every sky stop at 4.5:1
 * (src/__tests__/sky.test.ts).
 */

import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";

import { HomeIcon, NavigationIcon } from "@/components/icons/Icon";
import { WxText } from "@/components/weather/WxText";
import { usePageColors } from "@/hooks/usePageColors";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import {
  cardAccessibleName,
  highLowLabel,
  tempLabel,
  type CardSummary,
} from "@/shell/location-card";
import { BORDER, RADIUS, SIZE, SPACE, TOUCH, withAlpha } from "@/theme/mzizi";
import {
  NEUTRAL_SKY,
  SKY_FG,
  SKY_FG_DIM,
  SKY_SURFACE,
  skyStops,
} from "@/theme/sky";

import { MoreIcon } from "./ShellIcons";

export type LocationWeatherCardProps = {
  name: string;
  summary: CardSummary | null;
  /** True while the weather is still on its way. */
  loading?: boolean;
  isCurrent?: boolean;
  isHome?: boolean;
  onPress: () => void;
  /** Actions (Home, Remove); My Location has none. */
  onMore?: () => void;
  testID?: string;
};

export function LocationWeatherCard({
  name,
  summary,
  loading = false,
  isCurrent = false,
  isHome = false,
  onPress,
  onMore,
  testID,
}: LocationWeatherCardProps) {
  const { dark } = usePageColors();
  const reduceMotion = useReduceMotion();
  const stops = skyStops(summary?.family ?? NEUTRAL_SKY, dark);
  const label = cardAccessibleName({ name, summary, isCurrent, isHome });
  const eyebrow = isCurrent ? "My Location" : isHome ? "Home" : null;

  return (
    <View style={styles.wrap} testID={testID}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={loading ? `${name}, loading weather` : label}
        accessibilityHint="Shows the weather here"
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          { transform: pressed && !reduceMotion ? [{ scale: 0.98 }] : [] },
        ]}
      >
        <LinearGradient
          colors={[stops.top, stops.mid, stops.bottom]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.left}>
          {eyebrow ? (
            <View style={styles.eyebrow}>
              {isCurrent ? (
                <NavigationIcon size={SIZE.iconEyebrow} color={SKY_FG_DIM} />
              ) : (
                <HomeIcon size={SIZE.iconEyebrow} color={SKY_FG_DIM} />
              )}
              <WxText
                type="caption"
                weight={600}
                family="mono"
                tracking="widest"
                uppercase
                color={SKY_FG_DIM}
              >
                {eyebrow}
              </WxText>
            </View>
          ) : null}
          <WxText
            type="h5"
            weight={600}
            family="serif"
            color={SKY_FG}
            numberOfLines={1}
          >
            {name}
          </WxText>
          <WxText type="bodySm" color={SKY_FG_DIM} numberOfLines={1}>
            {loading
              ? "Loading…"
              : summary
                ? [summary.localTime, summary.condition]
                    .filter(Boolean)
                    .join(" · ")
                : "Weather unavailable"}
          </WxText>
        </View>
        <View style={[styles.right, onMore ? styles.clearMore : null]}>
          <WxText type="h2" weight={400} color={SKY_FG} tabular>
            {summary ? tempLabel(summary.temperature) : "--"}
          </WxText>
          {summary ? (
            <WxText type="bodySm" weight={600} color={SKY_FG_DIM} tabular>
              {highLowLabel(summary.high, summary.low)}
            </WxText>
          ) : null}
        </View>
      </Pressable>
      {onMore ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Actions for ${name}`}
          onPress={onMore}
          hitSlop={SPACE.hair}
          style={({ pressed }) => [
            styles.more,
            {
              backgroundColor: withAlpha(
                SKY_FG,
                pressed
                  ? SKY_SURFACE.round.fillPressed
                  : SKY_SURFACE.round.fill,
              ),
              borderColor: withAlpha(SKY_FG, SKY_SURFACE.round.border),
            },
          ]}
        >
          <MoreIcon size={SIZE.iconMd} color={SKY_FG} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative" },
  card: {
    minHeight: TOUCH.default * 2,
    borderRadius: RADIUS.skyCard,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    padding: SPACE.card,
    gap: SPACE.stack,
  },
  left: { flex: 1, minWidth: 0, gap: SPACE.hair },
  eyebrow: { flexDirection: "row", alignItems: "center", gap: SPACE.tight },
  right: { alignItems: "flex-end" },
  // Leave room for the ⋯ control at the card's top-right corner.
  clearMore: { paddingTop: TOUCH.min - SPACE.card },
  more: {
    position: "absolute",
    top: SPACE.hair,
    right: SPACE.hair,
    width: TOUCH.min,
    height: TOUCH.min,
    borderRadius: RADIUS.pill,
    borderWidth: BORDER.sky,
    alignItems: "center",
    justifyContent: "center",
  },
});
