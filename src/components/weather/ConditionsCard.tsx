/**
 * The hourly card under the hero (the web's `HourlyScrollCards`, sky
 * variant; titled "Hourly forecast" so it is not a second "Conditions"
 * beside the tile grid, issue #61): a translucent bordered card on the sky holding the one-sentence
 * outlook and the hour-by-hour strip. The sentence is built by the same
 * deterministic rule as the web (no AI call). Every hour label, and which hour
 * is "Now", is read in the PLACE's time with the forecast's UTC offset, never
 * the phone's clock.
 *
 * The fill and hairline are the sky foreground at low alpha: no shadow, no
 * blur. The strip scrolls sideways inside the card; each hour is one
 * VoiceOver item ("Now: 28 degrees, Overcast").
 */

import { type ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { WeatherIcon } from "@/components/icons/Icon";
import { NoSwipeZone } from "@/components/shell/NoSwipeZone";
import { heroOutlook } from "@/shared/hero";
import {
  currentHourIndex,
  locationClockLabel,
  resolveOffsetSeconds,
} from "@/shared/location-time";
import { type WeatherData, weatherCodeToInfo } from "@/shared/weather";
import { BORDER, RADIUS, SIZE, SPACE, withAlpha } from "@/theme/mzizi";
import { SKY_FG, SKY_FG_DIM, SKY_SURFACE } from "@/theme/sky";

import { SectionHeader } from "./SectionHeader";
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

function finiteOr(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * The strip's hours, starting at the place's current hour. "Now" takes the
 * current reading (temperature, condition, day or night), as the hero does;
 * the later hours are the forecast. Pure.
 */
export function hourTiles(forecast: WeatherData, now: Date): HourTile[] {
  const hourly = forecast.hourly;
  if (!hourly?.time?.length) return [];
  const offset = resolveOffsetSeconds(forecast.utc_offset_seconds, now);
  const start = currentHourIndex(hourly.time, offset, now);
  // "Now" is the reading the hero shows, not the hour's forecast, so the two
  // never disagree on one screen (issue #62).
  const now0 = forecast.current;
  // With a reading, "Now" takes the hero's values and the hero's fallbacks
  // (clear, by day) for a field it lacks, so the two always agree.
  const nowTemp = finiteOr(now0?.temperature_2m);
  const hasNow = nowTemp !== null;
  const nowCode = hasNow ? (finiteOr(now0?.weather_code) ?? 0) : null;
  const nowIsDay = hasNow ? (finiteOr(now0?.is_day) ?? 1) : null;
  return hourly.time.slice(start, start + STRIP_HOURS).map((time, i) => {
    const idx = start + i;
    const isNow = i === 0;
    const code = (isNow ? nowCode : null) ?? hourly.weather_code[idx];
    const info = weatherCodeToInfo(code);
    const temp = Math.round(
      (isNow ? nowTemp : null) ?? hourly.temperature_2m[idx],
    );
    const rain = hourly.precipitation_probability?.[idx] ?? 0;
    const label = i === 0 ? "Now" : locationClockLabel(time, offset);
    return {
      time,
      label,
      temp,
      code,
      isDay: ((isNow ? nowIsDay : null) ?? hourly.is_day[idx]) === 1,
      rainPct: rain > 0 ? rain : null,
      spoken: `${label}: ${temp} degrees, ${info.label}${rain > 0 ? `, ${rain}% chance of rain` : ""}`,
    };
  });
}

export type ConditionsCardProps = {
  forecast: WeatherData;
  now: Date;
  /** A quiet line at the foot of the card (the season), under a hairline. */
  footer?: ReactNode;
  /** Opens the place's /forecast page; no link without it. */
  onOpenForecast?: () => void;
};

export function ConditionsCard({
  forecast,
  now,
  footer,
  onOpenForecast,
}: ConditionsCardProps) {
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
      <SectionHeader
        title="Hourly forecast"
        titleColor={SKY_FG}
        actionColor={SKY_FG}
        action={
          onOpenForecast
            ? {
                label: "Full forecast",
                spoken: "Full forecast, hourly and 7-day",
                onPress: onOpenForecast,
                testID: "full-forecast-link",
              }
            : undefined
        }
      />
      {outlook ? (
        <View style={[styles.outlook, { borderBottomColor: hairline }]}>
          <WxText type="body" color={SKY_FG_DIM}>
            {outlook}
          </WxText>
        </View>
      ) : null}
      <NoSwipeZone>
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
      </NoSwipeZone>
      {footer ? (
        <View style={[styles.footer, { borderTopColor: hairline }]}>
          {footer}
        </View>
      ) : null}
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
  footer: {
    marginTop: SPACE.stack,
    paddingTop: SPACE.stack,
    borderTopWidth: BORDER.rest,
    alignItems: "center",
  },
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
