/**
 * The open-sky hero: no card, no decorative shapes. A centred stack straight on
 * the page sky, on the Mzizi type scale only:
 *
 *   top row   back / breadcrumb at the left, round Share and Settings at the right
 *   eyebrow   MY LOCATION or HOME, else the place's own clock (caption, mono)
 *   name      Noto Serif, h2, weight 600
 *   numeral   Noto Sans, display, weight 400, tight tracking
 *   condition a drawn glyph and the condition (h5, weight 400)
 *   H / L     body-lg, weight 600, wraps between the two at large text sizes
 *
 * The same rows, sizes and order as the web's `CurrentConditions`
 * (mukoko-weather `src/components/weather/CurrentConditions.tsx`). White text
 * on every sky stop at 4.5:1 or better (src/__tests__/sky.test.ts). The eyebrow
 * line is always reserved, so the clock arriving does not move the page.
 */

import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import {
  NavigationIcon,
  HomeIcon,
  ShareIcon,
  UserIcon,
  WeatherIcon,
} from "@/components/icons/Icon";
import {
  formatHighLowParts,
  heroBadgeLabel,
  heroEyebrowBadges,
  heroLocalTime,
  type HeroBadge,
} from "@/shared/hero";
import { weatherCodeToInfo } from "@/shared/weather";
import { SIZE, SPACE, lineHeightOf } from "@/theme/mzizi";
import { SKY_FG, SKY_FG_DIM } from "@/theme/sky";

import { RoundControl } from "./RoundControl";
import { WxText } from "./WxText";

export type SkyHeroProps = {
  name: string;
  temperature: number | null | undefined;
  weatherCode: number;
  isDay: boolean;
  high?: number | null;
  low?: number | null;
  /** The place's UTC offset: the eyebrow clock reads in the PLACE's time. */
  utcOffsetSeconds?: number;
  now: Date;
  isCurrentLocation?: boolean;
  isHome?: boolean;
  /** The trail above the name, for example "Zimbabwe / Mashonaland East". */
  breadcrumb?: string;
  /** A control at the left of the top row (Back on a place's page). */
  leading?: ReactNode;
  onShare: () => void;
  onSettings: () => void;
};

function EyebrowBadge({ badge }: { badge: HeroBadge }) {
  return (
    <View style={styles.badge}>
      {badge === "current" ? (
        <NavigationIcon size={SIZE.iconEyebrow} color={SKY_FG_DIM} />
      ) : (
        <HomeIcon size={SIZE.iconEyebrow} color={SKY_FG_DIM} />
      )}
      <WxText
        type="caption"
        weight={600}
        family="mono"
        uppercase
        tracking="widest"
        color={SKY_FG_DIM}
      >
        {heroBadgeLabel(badge)}
      </WxText>
    </View>
  );
}

/**
 * The top row: a back control and the trail at the left, round Share and
 * Settings at the right. The same row heads the loading and error states, so
 * the controls never move.
 */
export function HeroTopRow({
  name,
  breadcrumb,
  leading,
  onShare,
  onSettings,
}: Pick<
  SkyHeroProps,
  "name" | "breadcrumb" | "leading" | "onShare" | "onSettings"
>) {
  return (
    <View style={styles.topRow}>
      <View style={styles.leading}>
        {leading}
        {breadcrumb ? (
          <View style={styles.trail}>
            <WxText type="bodySm" color={SKY_FG_DIM}>
              {breadcrumb}
            </WxText>
          </View>
        ) : null}
      </View>
      <View style={styles.controls}>
        <RoundControl label={`Share weather for ${name}`} onPress={onShare}>
          <ShareIcon size={SIZE.iconMd} color={SKY_FG} />
        </RoundControl>
        <RoundControl label="Settings and sign in" onPress={onSettings}>
          <UserIcon size={SIZE.iconMd} color={SKY_FG} />
        </RoundControl>
      </View>
    </View>
  );
}

export function SkyHero({
  name,
  temperature,
  weatherCode,
  isDay,
  high,
  low,
  utcOffsetSeconds,
  now,
  isCurrentLocation = false,
  isHome = false,
  breadcrumb,
  leading,
  onShare,
  onSettings,
}: SkyHeroProps) {
  const info = weatherCodeToInfo(weatherCode);
  const badges = heroEyebrowBadges(isCurrentLocation, isHome);
  const highLow = formatHighLowParts(high, low);
  const hasTemp =
    typeof temperature === "number" && Number.isFinite(temperature);
  const rounded = hasTemp ? Math.round(temperature) : null;
  const localTime = heroLocalTime(now, utcOffsetSeconds);

  return (
    <View testID="sky-hero">
      <HeroTopRow
        name={name}
        breadcrumb={breadcrumb}
        leading={leading}
        onShare={onShare}
        onSettings={onSettings}
      />

      <View style={styles.stack}>
        <View style={styles.eyebrow}>
          {badges.length > 0 ? (
            badges.map((badge, i) => (
              <View key={badge} style={styles.badge}>
                {i > 0 ? (
                  <WxText type="caption" color={SKY_FG_DIM}>
                    ·
                  </WxText>
                ) : null}
                <EyebrowBadge badge={badge} />
              </View>
            ))
          ) : localTime ? (
            <WxText
              type="caption"
              weight={600}
              family="mono"
              tracking="widest"
              color={SKY_FG_DIM}
            >
              {localTime}
            </WxText>
          ) : null}
        </View>

        <WxText
          type="h2"
          weight={600}
          family="serif"
          align="center"
          color={SKY_FG}
          accessibilityRole="header"
        >
          {name}
        </WxText>

        <WxText
          type="display"
          weight={400}
          tracking="tight"
          tabular
          align="center"
          color={SKY_FG}
          numberOfLines={1}
          adjustsFontSizeToFit
          style={styles.next}
          accessibilityLabel={
            rounded === null
              ? "Temperature unavailable"
              : `${rounded} degrees Celsius`
          }
        >
          {rounded === null ? "—" : `${rounded}°`}
        </WxText>

        <View style={[styles.condition, styles.next]}>
          <WeatherIcon
            code={weatherCode}
            isDay={isDay}
            size={SIZE.iconHero}
            color={SKY_FG}
          />
          <WxText type="h5" weight={400} color={SKY_FG}>
            {info.label}
          </WxText>
        </View>

        {highLow ? (
          <View style={[styles.highLow, styles.next]}>
            {highLow.map((part) => (
              <WxText
                key={part}
                type="bodyLg"
                weight={600}
                tabular
                color={SKY_FG_DIM}
              >
                {part}
              </WxText>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACE.stack,
    paddingTop: SPACE.hair,
  },
  leading: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.snug,
    minWidth: 0,
  },
  trail: { flexShrink: 1 },
  controls: { flexDirection: "row", alignItems: "center", gap: SPACE.snug },
  stack: {
    alignItems: "center",
    paddingTop: SPACE.heroTop,
    paddingBottom: SPACE.heroBottom,
  },
  eyebrow: {
    minHeight: lineHeightOf("caption"),
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    columnGap: SPACE.snug,
  },
  badge: { flexDirection: "row", alignItems: "center", gap: SPACE.snug },
  next: { marginTop: SPACE.hair },
  condition: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACE.tight,
  },
  highLow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    columnGap: SPACE.stack,
  },
});
