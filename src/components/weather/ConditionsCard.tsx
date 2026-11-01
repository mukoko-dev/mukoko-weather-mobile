/**
 * The Conditions card under the hero (the web's `HourlyScrollCards`, sky
 * variant): a translucent bordered card on the sky holding the one-sentence
 * outlook and the hour-by-hour strip. The sentence is built by the same
 * deterministic rule as the web (no AI call). Every hour label, and which hour
 * is "Now", is read in the PLACE's time with the forecast's UTC offset, never
 * the phone's clock.
 *
 * The fill and hairline are the sky foreground at low alpha: no shadow, no
 * blur. The strip scrolls sideways inside the card; each hour is one
 * VoiceOver item ("Now: 28 degrees, Overcast").
 */

import { ScrollView, StyleSheet, View } from "react-native";

import { WeatherIcon } from "@/components/icons/Icon";
import { heroOutlook } from "@/shared/hero";
import {
  currentHourIndex,
  locationClockLabel,
  resolveOffsetSeconds,
} from "@/shared/location-time";
import { type WeatherData, weatherCodeToInfo } from "@/shared/weather";
import { BORDER, RADIUS, SIZE, SPACE, withAlpha } from "@/theme/mzizi";
import { SKY_FG, SKY_FG_DIM, SKY_SURFACE } from "@/theme/sky";

import { WxText } from "./WxText";

/** Hours in the strip. */
export const STRIP_HOURS = 24;

export type HourTile = {
  time: string;
  label: string;
  temp: number;
  code: number;
  isDay: boolean;
  /** Rain chance in percent, only when above zero (as on the web). */
  rainPct: number | null;
  spoken: string;
};

/** The strip's hours, starting at the place's current hour. Pure. */
export function hourTiles(forecast: WeatherData, now: Date): HourTile[] {
  const hourly = forecast.hourly;
  if (!hourly?.time?.length) return [];
  const offset = resolveOffsetSeconds(forecast.utc_offset_seconds, now);
  const start = currentHourIndex(hourly.time, offset, now);
  return hourly.time.slice(start, start + STRIP_HOURS).map((time, i) => {
    const idx = start + i;
    const code = hourly.weather_code[idx];
    const info = weatherCodeToInfo(code);
    const temp = Math.round(hourly.temperature_2m[idx]);
    const rain = hourly.precipitation_probability?.[idx] ?? 0;
    const label = i === 0 ? "Now" : locationClockLabel(time, offset);
    return {
      time,
      label,
      temp,
      code,
      isDay: hourly.is_day[idx] === 1,
      rainPct: rain > 0 ? rain : null,
      spoken: `${label}: ${temp} degrees, ${info.label}${rain > 0 ? `, ${rain}% chance of rain` : ""}`,
    };
  });
}

export type ConditionsCardProps = {
  forecast: WeatherData;
  now: Date;
};

export function ConditionsCard({ forecast, now }: ConditionsCardProps) {
  const hours = hourTiles(forecast, now);
  if (hours.length === 0) return null;
  const outlook = heroOutlook(
    forecast.hourly,
    now,
    forecast.utc_offset_seconds,
  );
  const hairline = withAlpha(SKY_FG, SKY_SURFACE.card.border);
  return (
    <View
      testID="conditions-card"
      style={[
        styles.card,
        {
          backgroundColor: withAlpha(SKY_FG, SKY_SURFACE.card.fill),
          borderColor: hairline,
        },
      ]}
    >
      <WxText
        type="h6"
        weight={600}
        family="serif"
        color={SKY_FG}
        accessibilityRole="header"
      >
        Conditions
      </WxText>
      {outlook ? (
        <View style={[styles.outlook, { borderBottomColor: hairline }]}>
          <WxText type="body" color={SKY_FG_DIM}>
            {outlook}
          </WxText>
        </View>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel="Hourly forecast, scroll horizontally"
        style={styles.strip}
        contentContainerStyle={styles.hours}
      >
        {hours.map((h) => (
          <View
            key={h.time}
            accessible
            accessibilityLabel={h.spoken}
            style={styles.hour}
          >
            <WxText type="body" color={SKY_FG_DIM}>
              {h.label}
            </WxText>
            <WeatherIcon
              code={h.code}
              isDay={h.isDay}
              size={SIZE.iconMd}
              color={SKY_FG}
            />
            <WxText type="body" weight={600} tabular color={SKY_FG}>
              {`${h.temp}°`}
            </WxText>
            {h.rainPct !== null ? (
              <WxText type="body" weight={600} tabular color={SKY_FG}>
                {`${h.rainPct}%`}
              </WxText>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.skyCard,
    borderWidth: BORDER.sky,
    padding: SPACE.card,
    overflow: "hidden",
  },
  outlook: {
    marginTop: SPACE.hair,
    paddingBottom: SPACE.stack,
    borderBottomWidth: BORDER.rest,
  },
  strip: { marginTop: SPACE.stack },
  hours: { gap: SPACE.cozy, paddingBottom: SPACE.snug },
  hour: {
    minWidth: SIZE.hourTileMin,
    alignItems: "center",
    gap: SPACE.tight,
    paddingHorizontal: SPACE.cozy,
    paddingVertical: SPACE.snug,
    borderRadius: RADIUS.input,
  },
});
