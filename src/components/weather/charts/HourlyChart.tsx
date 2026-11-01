/**
 * The 24-hour chart on /forecast (the web's `HourlyChart`): temperature as a
 * filled line, feels like as a dashed line, and the chance of rain as faint
 * bars on a hidden 0 to 100 axis. The next 24 hours start at the place's
 * current hour (src/shared/chart-data.ts).
 */

import { useMemo } from "react";

import { type HourlyDataPoint, prepareHourlyData } from "@/shared/chart-data";
import { type HourlyWeather } from "@/shared/weather";

import { paddedRange } from "./chart-layout";
import { type SeriesConfig, TimeSeriesChart } from "./TimeSeriesChart";

const RAIN_LABEL = "Rain %";

export const HOURLY_SERIES: SeriesConfig[] = [
  { key: "temp", label: "Temperature", color: "temp", fill: true, order: 1 },
  {
    key: "feelsLike",
    label: "Feels Like",
    color: "feels",
    dashed: true,
    order: 2,
  },
  {
    key: "rain",
    label: RAIN_LABEL,
    color: "rainProb",
    type: "bar",
    opacity: 0.35,
    yAxisID: "rain",
    order: 3,
  },
];

const degrees = (v: number) => `${v}°`;

/** How each value reads: "21°C", and the rain chance "30%". */
export function hourlyValue(label: string, value: number): string {
  return label === RAIN_LABEL ? `${value}%` : `${value}°C`;
}

/** The temperature axis: the data's range, two degrees either side. */
export function hourlyAxes(data: readonly HourlyDataPoint[]) {
  const { min, max } = paddedRange(
    data.flatMap((d) => [d.temp, d.feelsLike]),
    2,
    { min: 0, max: 30 },
  );
  return {
    y: { position: "left" as const, min, max, format: degrees },
    rain: { position: "right" as const, min: 0, max: 100, display: false },
  };
}

type Props = {
  hourly: HourlyWeather;
  /** The place's UTC offset: "Now" and every label are read in the place's time. */
  utcOffsetSeconds?: number;
  now?: Date;
};

export function HourlyChart({ hourly, utcOffsetSeconds, now }: Props) {
  const data = useMemo(
    () => prepareHourlyData(hourly, utcOffsetSeconds, now),
    [hourly, utcOffsetSeconds, now],
  );
  const yAxes = useMemo(() => hourlyAxes(data), [data]);
  return (
    <TimeSeriesChart
      title="Temperature and chance of rain, next 24 hours"
      data={data}
      labelKey="label"
      series={HOURLY_SERIES}
      yAxes={yAxes}
      valueFormat={hourlyValue}
      aspect={2}
      testID="hourly-chart"
    />
  );
}
