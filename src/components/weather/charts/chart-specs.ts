/**
 * What each detail chart draws: the series, their colours, the axes and the
 * title. One pure function per chart, so the choices (the web's
 * `WindSpeedChart`, `UVIndexChart`, `FeelsLikeChart`, `VisibilityChart`,
 * `PrecipitationChart`, `HumidityChart`, `PressureChart`, `MonthlyNormalsChart`
 * and `ModelComparisonChart`) are tested without rendering. Colours come from
 * src/theme/weather-scales.ts: a measured quantity has its weather colour, a
 * model its categorical line.
 */

import { type ColorSchemeName } from "react-native";

import { type MonthlyRow } from "@/shared/climate-averages";
import { type ComparisonData } from "@/shared/model-comparison";
import {
  type MetricChart,
  type MetricSeriesPoint,
  type UvDay,
} from "@/shared/metric-details";
import { type NowcastRow } from "@/shared/nowcast";
import { WX_UV, uvBandIndex } from "@/theme/mzizi";
import { modelLineColor, seriesColor } from "@/theme/weather-scales";

import { type SeriesChartProps } from "./SeriesChart";

export type ChartSpec = Omit<SeriesChartProps, "testID">;

const pick = (
  points: readonly MetricSeriesPoint[],
  key: keyof Omit<MetricSeriesPoint, "label">,
): number[] => points.map((p) => p[key]);

const maxOf = (values: readonly number[], floor = 0) =>
  values.length > 0 ? Math.max(...values) : floor;
const minOf = (values: readonly number[], ceil = 0) =>
  values.length > 0 ? Math.min(...values) : ceil;

const num = (v: number) => `${v}`;

/** The chart behind a Conditions tile's detail: the next 24 hours. */
export function metricChartSpec(
  chart: NonNullable<MetricChart>,
  points: readonly MetricSeriesPoint[],
  scheme: ColorSchemeName,
): ChartSpec {
  const labels = points.map((p) => p.label);
  const c = (k: Parameters<typeof seriesColor>[0]) => seriesColor(k, scheme);
  switch (chart) {
    case "wind": {
      const speed = pick(points, "windSpeed");
      const gusts = pick(points, "windGusts");
      return {
        title: "Wind, next 24 hours",
        labels,
        legend: true,
        series: [
          {
            key: "speed",
            label: "Wind speed (km/h)",
            unit: "km/h",
            values: speed,
            color: c("wind"),
            kind: "area",
          },
          {
            key: "gusts",
            label: "Gusts (km/h)",
            unit: "km/h",
            values: gusts,
            color: c("gust"),
            dashed: true,
          },
        ],
        left: { min: 0, max: maxOf([...speed, ...gusts], 20) + 5, format: num },
      };
    }
    case "uv": {
      const uv = pick(points, "uvIndex");
      return {
        title: "UV index, next 24 hours",
        labels,
        series: [
          {
            key: "uv",
            label: "UV index",
            unit: "",
            values: uv,
            color: WX_UV[2],
            barColors: uv.map((v) => WX_UV[uvBandIndex(v)]),
            kind: "bar",
            opacity: 0.85,
          },
        ],
        left: { min: 0, max: Math.max(maxOf(uv), 11) + 1, format: num },
      };
    }
    case "feels":
      return {
        title: "Feels like and actual temperature, next 24 hours",
        labels,
        series: [
          {
            key: "feels",
            label: "Feels like",
            unit: "°",
            values: pick(points, "feelsLike"),
            color: c("feels"),
            kind: "area",
            opacity: 0.12,
          },
          {
            key: "actual",
            label: "Actual",
            unit: "°",
            values: pick(points, "temperature"),
            color: c("temp"),
            dashed: true,
          },
        ],
        left: { format: (v) => `${v}°` },
      };
    case "visibility":
      return {
        title: "Visibility, next 24 hours",
        labels,
        series: [
          {
            key: "visibility",
            label: "Visibility",
            unit: "km",
            values: pick(points, "visibility"),
            color: c("visibility"),
            kind: "area",
            opacity: 0.12,
          },
        ],
        left: { min: 0, format: (v) => `${v} km` },
      };
    case "rain":
      return {
        title: "Rain, next 24 hours",
        labels,
        series: [
          {
            key: "rain",
            label: "Rainfall (mm)",
            unit: "mm",
            values: pick(points, "precipitation"),
            color: c("rain"),
            kind: "bar",
            opacity: 0.6,
          },
          {
            key: "chance",
            label: "Chance (%)",
            unit: "%",
            values: pick(points, "rainProbability"),
            color: c("rainProb"),
            dashed: true,
            axis: "right",
          },
        ],
        left: { min: 0, format: (v) => `${v} mm` },
        right: { min: 0, max: 100, format: (v) => `${v}%` },
      };
    case "humidity":
      return {
        title: "Humidity, next 24 hours",
        labels,
        series: [
          {
            key: "humidity",
            label: "Humidity",
            unit: "%",
            values: pick(points, "humidity"),
            color: c("humidity"),
            kind: "area",
            opacity: 0.2,
          },
        ],
        left: { min: 0, max: 100, format: (v) => `${v}%` },
      };
    case "pressure": {
      const p = pick(points, "pressure");
      return {
        title: "Pressure, next 24 hours",
        labels,
        legend: true,
        series: [
          {
            key: "pressure",
            label: "Pressure (hPa)",
            unit: "hPa",
            values: p,
            color: c("pressure"),
          },
        ],
        left: { min: minOf(p, 1010) - 2, max: maxOf(p, 1020) + 2, format: num },
      };
    }
  }
}

/** The peak UV of the next days, one bar a day. */
export function uvDaysChartSpec(days: readonly UvDay[]): ChartSpec {
  return {
    title: "Peak UV, next days",
    labels: days.map((d) => d.label),
    series: [
      {
        key: "uv-days",
        label: "Peak UV index",
        unit: "",
        values: days.map((d) => d.peak),
        color: WX_UV[2],
        barColors: days.map((d) => WX_UV[uvBandIndex(d.peak)]),
        kind: "bar",
        opacity: 0.85,
      },
    ],
    left: {
      min: 0,
      max: Math.max(maxOf(days.map((d) => d.peak)), 11) + 1,
      format: num,
    },
    maxXLabels: 7,
  };
}

/** The twelve monthly normals: lines for temperature, bars for rainfall. */
export function monthlyChartSpec(
  rows: readonly MonthlyRow[],
  mode: "temperature" | "precipitation",
  scheme: ColorSchemeName,
): ChartSpec {
  const labels = rows.map((r) => r.label);
  if (mode === "temperature") {
    return {
      title: "Average high and low by month",
      labels,
      series: [
        {
          key: "high",
          label: "Average high",
          unit: "°",
          values: rows.map((r) => r.meanHighC),
          color: seriesColor("temp", scheme),
        },
        {
          key: "low",
          label: "Average low",
          unit: "°",
          values: rows.map((r) => r.meanLowC),
          color: seriesColor("tempLow", scheme),
          dashed: true,
        },
      ],
      left: { format: (v) => `${v}°` },
      maxXLabels: 6,
    };
  }
  return {
    title: "Average rainfall by month",
    labels,
    legend: true,
    series: [
      {
        key: "rain",
        label: "Average rainfall (mm)",
        unit: "mm",
        values: rows.map((r) => r.precipMm),
        color: seriesColor("rain", scheme),
        kind: "bar",
        opacity: 0.6,
      },
    ],
    left: { min: 0, format: (v) => `${v} mm` },
    maxXLabels: 6,
  };
}

/** The model lines: where the forecast models agree or diverge. */
export function modelChartSpec(
  data: ComparisonData,
  scheme: ColorSchemeName,
): ChartSpec {
  return {
    title: "Forecast models, hourly temperature",
    labels: data.times.map((t) => t.slice(11, 16)),
    series: data.series.map((s) => ({
      key: s.key,
      label: s.label,
      unit: "°",
      values: s.values,
      color: modelLineColor(s.key, scheme),
    })),
    left: { format: (v) => `${Math.round(v)}°` },
    legend: true,
  };
}

/** The next hour in four 15-minute bars. */
export function nowcastChartSpec(
  rows: readonly NowcastRow[],
  scheme: ColorSchemeName,
): ChartSpec {
  return {
    title: "Rain, next hour",
    labels: rows.map((r) => r.label),
    series: [
      {
        key: "nowcast",
        label: "Rain (mm)",
        unit: "mm",
        values: rows.map((r) => r.precip),
        color: seriesColor("rain", scheme),
        kind: "bar",
        opacity: 0.75,
      },
    ],
    left: { min: 0, format: (v) => `${v} mm` },
    maxXLabels: 4,
  };
}
