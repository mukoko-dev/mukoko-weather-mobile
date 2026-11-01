/**
 * Wind speed as a filled line and gusts as a dashed line, in km/h, from zero up
 * to the strongest gust plus 5 (the web's `WindSpeedChart`).
 */

import { useMemo } from "react";

import { type AtmosphericDataPoint } from "@/shared/chart-data";

import { finite } from "./chart-layout";
import { type SeriesConfig, TimeSeriesChart } from "./TimeSeriesChart";

export const WIND_SERIES: SeriesConfig[] = [
  { key: "windSpeed", label: "Wind Speed", color: "wind", fill: true },
  { key: "windGusts", label: "Wind Gusts", color: "gust", dashed: true },
];

/** From zero to the strongest reading plus 5 km/h (20 when there is none). */
export function windAxes(data: readonly AtmosphericDataPoint[]) {
  const all = finite(data.flatMap((d) => [d.windSpeed, d.windGusts]));
  return { y: { min: 0, max: (all.length > 0 ? Math.max(...all) : 20) + 5 } };
}

export function WindSpeedChart({ data }: { data: AtmosphericDataPoint[] }) {
  const yAxes = useMemo(() => windAxes(data), [data]);
  return (
    <TimeSeriesChart
      title="Wind speed and gusts, next 24 hours"
      data={data}
      labelKey="label"
      series={WIND_SERIES}
      yAxes={yAxes}
      valueFormat={(_label, value) => `${value} km/h`}
      testID="wind-chart"
    />
  );
}
