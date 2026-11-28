/**
 * The home's one forecast element: the hour-by-hour strip (Now and the hours
 * after it: icon, temperature, rain chance) on a translucent sky card. The
 * same hours and labels as the Conditions card (`hourTiles`), without its
 * heading, outlook sentence and season footer, so the home needs no scrolling.
 * The strip scrolls sideways only; text sizes are capped so the card never
 * outgrows the room above the bottom bar.
 */

import { ScrollView, StyleSheet, View } from "react-native";

import { WeatherIcon } from "@/components/icons/Icon";
import { NoSwipeZone } from "@/components/shell/NoSwipeZone";
import { type WeatherData } from "@/shared/weather";
import {
  BORDER,
  RADIUS,
  SIZE,
  SPACE,
  TEXT_SCALE_MAX,
  withAlpha,
} from "@/theme/mzizi";
import { SKY_FG, SKY_FG_DIM, SKY_SURFACE } from "@/theme/sky";

import { hourTiles } from "./ConditionsCard";
import { WxText } from "./WxText";

export type HomeHourlyStripProps = {
  forecast: WeatherData;
  now: Date;
};

export function HomeHourlyStrip({ forecast, now }: HomeHourlyStripProps) {
  const hours = hourTiles(forecast, now);
  if (hours.length === 0) return null;
  const cap = TEXT_SCALE_MAX.chrome;
  return (
    <View
      testID="home-hourly-strip"
      style={[
        styles.card,
        {
          backgroundColor: withAlpha(SKY_FG, SKY_SURFACE.card.fill),
          borderColor: withAlpha(SKY_FG, SKY_SURFACE.card.border),
        },
      ]}
    >
      <NoSwipeZone>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityLabel="Hourly forecast, scroll horizontally"
          contentContainerStyle={styles.hours}
        >
          {hours.map((h) => (
            <View
              key={h.time}
              accessible
              accessibilityLabel={h.spoken}
              style={styles.hour}
            >
              <WxText
                type="body"
                color={SKY_FG_DIM}
                maxFontSizeMultiplier={cap}
              >
                {h.label}
              </WxText>
              <WeatherIcon
                code={h.code}
                isDay={h.isDay}
                size={SIZE.iconMd}
                color={SKY_FG}
              />
              <WxText
                type="body"
                weight={600}
                tabular
                color={SKY_FG}
                maxFontSizeMultiplier={cap}
              >
                {`${h.temp}°`}
              </WxText>
              <WxText
                type="body"
                weight={600}
                tabular
                color={SKY_FG}
                maxFontSizeMultiplier={cap}
              >
                {h.rainPct !== null ? `${h.rainPct}%` : " "}
              </WxText>
            </View>
          ))}
        </ScrollView>
      </NoSwipeZone>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexShrink: 0,
    borderRadius: RADIUS.skyCard,
    borderWidth: BORDER.sky,
    padding: SPACE.card,
    overflow: "hidden",
  },
  hours: { gap: SPACE.cozy },
  hour: {
    minWidth: SIZE.hourTileMin,
    alignItems: "center",
    gap: SPACE.tight,
    paddingHorizontal: SPACE.cozy,
    paddingVertical: SPACE.snug,
    borderRadius: RADIUS.input,
  },
});
