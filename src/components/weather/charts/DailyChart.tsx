/**
 * The week chart on /forecast (the web's `DailyChart`): highs and lows as
 * filled lines with a dot per day, feels-like highs and lows as dashed lines.
 * Day names are the weekday of the place's calendar date.
 */

import { useMemo } from "react";

import { type DailyDataPoint, prepareDailyData } from "@/shared/chart-data";
import { type DailyWeather } from "@/shared/weather";

import { paddedRange } from "./chart-layout";
import { type SeriesConfig, TimeSeriesChart } from "./TimeSeriesChart";

export const DAILY_SERIES: SeriesConfig[] = [
  { key: "high", label: "High", color: "temp", fill: true, order: 1, showDots: true },
  {
    key: "low",
    label: "Low",
    color: "tempLow",
    fill: true,
    dashed: true,
    order: 2,
    showDots: true,
  },
  { key: "feelsHigh", label: "Feels High", color: "feels", dashed: true, order: 3 },
  { key: "feelsLow", label: "Feels Low", color: "feelsLow", dashed: true, order: 4 },
];

const degrees = (v: number) => `${v}°`;

/** The temperature axis: every high, low and feels-like, two degrees either side. */
export function dailyAxes(data: readonly DailyDataPoint[]) {
  const { min, max } = paddedRange(
    data.flatMap((d) => [d.high, d.low, d.feelsHigh, d.feelsLow]),
    2,
    { min: 0, max: 30 },
  );
  return { y: { position: "left" as const, min, max, format: degrees } };
}

export function DailyChart({ daily }: { daily: DailyWeather }) {
  const data = useMemo(() => prepareDailyData(daily), [daily]);
  const yAxes = useMemo(() => dailyAxes(data), [data]);
  return (
    <TimeSeriesChart
      title="High and low temperature, next days"
      data={data}
      labelKey="day"
      series={DAILY_SERIES}
      yAxes={yAxes}
      valueFormat={(_label, value) => `${value}°C`}
      aspect={4 / 3}
      showDots
      testID="daily-chart"
    />
  );
}
