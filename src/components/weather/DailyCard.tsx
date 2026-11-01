/**
 * The 7-day forecast (the web's `DailyForecast`): the week chart, then one row
 * per day with the day and date, the condition icon and rain chance, the low,
 * a range bar scaled across the whole week, and the high, then a quiet line of
 * detail (feels-like, rainfall, wind, UV). Dates are the PLACE's calendar days,
 * read as UTC calendar dates so a phone in another zone never shifts a day.
 *
 * Like the web, it lives on the /forecast page, not on the location page.
 */

import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

import { WeatherIcon } from "@/components/icons/Icon";
import { dayName, dayOfMonth } from "@/shared/chart-data";
import { type WeatherData, uvLevel, weatherCodeToInfo } from "@/shared/weather";
import { usePageColors } from "@/hooks/usePageColors";
import {
  BORDER,
  RADIUS,
  SIZE,
  SPACE,
  TOUCH,
  WX_UV,
  uvBandIndex,
  withAlpha,
} from "@/theme/mzizi";

import { DailyChart } from "./charts/DailyChart";
import { PageCard } from "./PageCard";
import { WxText } from "./WxText";

export { dayName, dayOfMonth };

/** Position of a temperature within the week's range, 0 to 100 (the web's `tempPercent`). */
export function tempPercent(temp: number, absMin: number, absMax: number) {
  const range = absMax - absMin;
  if (range === 0) return 50;
  return ((temp - absMin) / range) * 100;
}

export type DayRow = {
  date: string;
  name: string;
  dateNum: number;
  label: string;
  icon: number;
  high: number;
  low: number;
  lowPct: number;
  highPct: number;
  rainPct: number;
  precipMm: number;
  wind: number;
  gust: number;
  feelsHigh: number;
  feelsLow: number;
  uv: number;
  uvLabel: string;
};

/** The week as rows with the range-bar positions worked out. Pure. */
export function dayRows(forecast: WeatherData): DayRow[] {
  const d = forecast.daily;
  if (!d?.time?.length) return [];
  const highs = d.temperature_2m_max.map(Math.round);
  const lows = d.temperature_2m_min.map(Math.round);
  const absMin = Math.min(...lows);
  const absMax = Math.max(...highs);
  return d.time.slice(0, 7).map((date, i) => {
    const info = weatherCodeToInfo(d.weather_code[i]);
    const high = highs[i];
    const low = lows[i];
    const uv = d.uv_index_max[i];
    const name = dayName(date, i);
    return {
      date,
      name,
      dateNum: dayOfMonth(date),
      label: `${name} ${dayOfMonth(date)}: ${info.label}, high ${high} degrees, low ${low} degrees`,
      icon: d.weather_code[i],
      high,
      low,
      lowPct: tempPercent(low, absMin, absMax),
      highPct: tempPercent(high, absMin, absMax),
      rainPct: d.precipitation_probability_max[i] ?? 0,
      precipMm: d.precipitation_sum[i] ?? 0,
      wind: Math.round(d.wind_speed_10m_max[i]),
      gust: Math.round(d.wind_gusts_10m_max[i]),
      feelsHigh: Math.round(d.apparent_temperature_max[i]),
      feelsLow: Math.round(d.apparent_temperature_min[i]),
      uv: uv ?? 0,
      uvLabel: uvLevel(uv ?? 0).label,
    };
  });
}

/** Smallest share of the bar a day's range takes, so a 1-degree day stays visible. */
const MIN_RANGE_PCT = 4;

function RangeBar({ row }: { row: DayRow }) {
  const { colors } = usePageColors();
  const width = Math.max(row.highPct - row.lowPct, MIN_RANGE_PCT);
  return (
    <View
      style={[styles.track, { backgroundColor: colors.tempTrack }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <LinearGradient
        colors={[colors.tempCool, colors.tempMild, colors.tempWarm]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.range, { left: `${row.lowPct}%`, width: `${width}%` }]}
      />
    </View>
  );
}

function DayItem({ row }: { row: DayRow }) {
  const { colors } = usePageColors();
  return (
    <View
      accessible
      accessibilityLabel={row.label}
      style={[styles.row, { backgroundColor: colors.background }]}
    >
      <View style={styles.main}>
        <View style={styles.day}>
          <WxText type="body" color={colors.textSecondary}>
            {row.name}
          </WxText>
          <WxText type="bodyLg" weight={700} color={colors.textPrimary}>
            {String(row.dateNum)}
          </WxText>
        </View>
        <View style={styles.icon}>
          <WeatherIcon
            code={row.icon}
            size={SIZE.iconDaily}
            color={colors.primary}
          />
          {row.rainPct > 0 ? (
            <WxText type="body" weight={600} color={colors.rain}>
              {`${row.rainPct}%`}
            </WxText>
          ) : null}
        </View>
        <WxText
          type="body"
          align="right"
          color={colors.textTertiary}
          style={styles.temp}
        >
          {`${row.low}°`}
        </WxText>
        <RangeBar row={row} />
        <WxText
          type="body"
          weight={600}
          color={colors.textPrimary}
          style={styles.temp}
        >
          {`${row.high}°`}
        </WxText>
      </View>
      <View style={styles.detail}>
        <WxText type="body" color={colors.textTertiary}>
          {`Feels ${row.feelsLow}°/${row.feelsHigh}°`}
        </WxText>
        {row.precipMm > 0 ? (
          <WxText type="body" color={colors.textTertiary}>
            {`${row.precipMm.toFixed(1)} mm`}
          </WxText>
        ) : null}
        <WxText type="body" color={colors.textTertiary}>
          {`Wind ${row.wind} km/h`}
        </WxText>
        {row.gust > row.wind ? (
          <WxText type="body" color={colors.textTertiary}>
            {`Gusts ${row.gust}`}
          </WxText>
        ) : null}
        <View style={styles.uv}>
          <View
            style={[
              styles.swatch,
              {
                backgroundColor: WX_UV[uvBandIndex(row.uv)],
                borderColor: colors.outline,
              },
            ]}
          />
          <WxText type="body" color={colors.textTertiary}>
            {`UV ${row.uv} ${row.uvLabel}`}
          </WxText>
        </View>
      </View>
    </View>
  );
}

export function DailyCard({ forecast }: { forecast: WeatherData }) {
  const rows = dayRows(forecast);
  if (rows.length === 0) return null;
  return (
    <PageCard title={`${rows.length}-Day Forecast`} testID="daily-card">
      <DailyChart daily={forecast.daily} />
      <View style={styles.list} accessibilityRole="list">
        {rows.map((row) => (
          <DayItem key={row.date} row={row} />
        ))}
      </View>
    </PageCard>
  );
}

const styles = StyleSheet.create({
  list: { gap: SPACE.tight },
  row: {
    borderRadius: RADIUS.input,
    paddingHorizontal: SPACE.stack,
    paddingVertical: SPACE.cozy,
    minHeight: TOUCH.min,
    gap: SPACE.tight,
  },
  main: { flexDirection: "row", alignItems: "center", gap: SPACE.snug },
  day: { width: SIZE.dayColumn, alignItems: "center" },
  icon: { width: SIZE.iconColumn, alignItems: "center", gap: SPACE.hair },
  temp: { width: SIZE.tempColumn, flexShrink: 0 },
  track: {
    flex: 1,
    height: SIZE.rangeBar,
    marginHorizontal: SPACE.hair,
    borderRadius: RADIUS.pill,
    overflow: "hidden",
  },
  range: { position: "absolute", top: 0, bottom: 0, borderRadius: RADIUS.pill },
  detail: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: SPACE.stack,
    rowGap: SPACE.hair,
  },
  uv: { flexDirection: "row", alignItems: "center", gap: SPACE.hair },
  swatch: {
    width: SIZE.swatch,
    height: SIZE.swatch,
    borderRadius: RADIUS.pill,
    borderWidth: BORDER.active,
  },
});
