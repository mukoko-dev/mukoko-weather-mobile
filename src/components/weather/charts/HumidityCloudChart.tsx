/**
 * Humidity as a filled line and cloud cover as a dashed line, both 0 to 100%
 * (the web's `HumidityCloudChart`). Reads any data with `humidity` and
 * `cloudCover` fields.
 */

import { type AtmosphericDataPoint } from "@/shared/chart-data";

import { type SeriesConfig, TimeSeriesChart } from "./TimeSeriesChart";

export const HUMIDITY_CLOUD_SERIES: SeriesConfig[] = [
  { key: "humidity", label: "Humidity", color: "humidity", fill: true, opacity: 0.3 },
  { key: "cloudCover", label: "Cloud Cover", color: "cloud", dashed: true },
];

const AXES = {
  y: { min: 0, max: 100, format: (v: number) => `${v}%` },
};

export function HumidityCloudChart({ data }: { data: AtmosphericDataPoint[] }) {
  return (
    <TimeSeriesChart
      title="Humidity and cloud cover, next 24 hours"
      data={data}
      labelKey="label"
      series={HUMIDITY_CLOUD_SERIES}
      yAxes={AXES}
      valueFormat={(_label, value) => `${value}%`}
      testID="humidity-cloud-chart"
    />
  );
}
