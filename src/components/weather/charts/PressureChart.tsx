/**
 * Barometric pressure as a line on an axis scaled to the data, 2 hPa either
 * side (the web's `PressureChart`).
 */

import { useMemo } from "react";

import { type AtmosphericDataPoint } from "@/shared/chart-data";

import { paddedRange } from "./chart-layout";
import { type SeriesConfig, TimeSeriesChart } from "./TimeSeriesChart";

export const PRESSURE_SERIES: SeriesConfig[] = [
  { key: "pressure", label: "Pressure", color: "pressure" },
];

/** The data's range, 2 hPa either side (1010 to 1020 when there is none). */
export function pressureAxes(data: readonly AtmosphericDataPoint[]) {
  const { min, max } = paddedRange(
    data.map((d) => d.pressure),
    2,
    { min: 1010, max: 1020 },
  );
  return { y: { min, max } };
}

export function PressureChart({ data }: { data: AtmosphericDataPoint[] }) {
  const yAxes = useMemo(() => pressureAxes(data), [data]);
  return (
    <TimeSeriesChart
      title="Barometric pressure, next 24 hours"
      data={data}
      labelKey="label"
      series={PRESSURE_SERIES}
      yAxes={yAxes}
      valueFormat={(_label, value) => `${value} hPa`}
      testID="pressure-chart"
    />
  );
}
