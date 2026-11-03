/**
 * UV index as bars, each coloured from its own value on the WHO UV scale (the
 * web's `UVIndexChart`): green, yellow, orange, red, violet. A colour that
 * encodes a weather value follows the convention, not a brand mineral.
 */

import { useMemo } from "react";

import { type AtmosphericDataPoint } from "@/shared/chart-data";
import { WX_UV, uvBandIndex } from "@/theme/mzizi";

import { finite } from "./chart-layout";
import { type SeriesConfig, TimeSeriesChart } from "./TimeSeriesChart";

/** The WHO colour of a UV value. */
export function uvBarColor(value: number | null): string {
  return WX_UV[uvBandIndex(value)];
}

export const UV_SERIES: SeriesConfig[] = [
  {
    key: "uvIndex",
    label: "UV Index",
    color: WX_UV[2],
    colorByValue: uvBarColor,
    type: "bar",
    opacity: 0.6,
  },
];

/** From zero to 12 (the scale's 11 plus one), or one above a stronger reading. */
export function uvAxes(data: readonly AtmosphericDataPoint[]) {
  const max = Math.max(...finite(data.map((d) => d.uvIndex)), 11) + 1;
  return { y: { min: 0, max } };
}

export function UVIndexChart({ data }: { data: AtmosphericDataPoint[] }) {
  const yAxes = useMemo(() => uvAxes(data), [data]);
  return (
    <TimeSeriesChart
      title="UV index, next 24 hours"
      data={data}
      labelKey="label"
      series={UV_SERIES}
      yAxes={yAxes}
      valueFormat={(_label, value) => `UV ${value}`}
      testID="uv-chart"
    />
  );
}
