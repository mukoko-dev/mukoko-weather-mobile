/**
 * Sunrise, sunset and the length of the day (the web's `SunTimes`). Both times
 * are the PLACE's own clock, whatever zone the phone is in. Each is one
 * VoiceOver item ("Sunrise at 05:16"); a missing time reads "unavailable", not
 * a made-up one.
 */

import { StyleSheet, View } from "react-native";

import { SunIcon, SunriseIcon, SunsetIcon } from "@/components/icons/Icon";
import { usePageColors } from "@/hooks/usePageColors";
import { sunTimes } from "@/shared/sun-times";
import { type DailyWeather } from "@/shared/weather";
import { SIZE, SPACE } from "@/theme/mzizi";

import { PageCard } from "./PageCard";
import { WxText } from "./WxText";

export type SunTimesCardProps = {
  daily: DailyWeather;
  /** The place's UTC offset in seconds. */
  utcOffsetSeconds?: number;
  now?: Date;
};

export function SunTimesCard({ daily, utcOffsetSeconds, now }: SunTimesCardProps) {
  const { colors } = usePageColors();
  const sun = sunTimes(daily, utcOffsetSeconds, now);
  const items = [
    {
      label: "Sunrise",
      value: sun.sunrise,
      spoken: sun.sunriseSpoken,
      icon: <SunriseIcon size={SIZE.iconMd} color={colors.sun} />,
    },
    {
      label: "Sunset",
      value: sun.sunset,
      spoken: sun.sunsetSpoken,
      icon: <SunsetIcon size={SIZE.iconMd} color={colors.primary} />,
    },
    {
      label: "Daylight",
      value: sun.daylight,
      spoken: sun.daylightSpoken,
      icon: <SunIcon size={SIZE.iconMd} color={colors.sun} />,
    },
  ];
  return (
    <PageCard title="Sun" testID="sun-times-card">
      <View style={styles.items}>
        {items.map((item) => (
          <View
            key={item.label}
            accessible
            accessibilityLabel={item.spoken}
            style={styles.item}
          >
            {item.icon}
            <View>
              <WxText type="body" color={colors.textTertiary}>
                {item.label}
              </WxText>
              <WxText type="body" weight={600} tabular color={colors.textPrimary}>
                {item.value}
              </WxText>
            </View>
          </View>
        ))}
      </View>
    </PageCard>
  );
}

const styles = StyleSheet.create({
  items: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.card },
  item: { flexDirection: "row", alignItems: "center", gap: SPACE.snug },
});
