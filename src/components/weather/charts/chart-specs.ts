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

import {
  type SeriesConfig,
  type TimeSeriesChartProps,
} from "./TimeSeriesChart";

/** One series of a spec: its readings per label, colour and how it draws. */
export type ChartSeries = {
  key: string;
  label: string;
  /** Said and shown after a value ("km/h"); may be empty. */
  unit: string;
  values: (number | null)[];
  /** A literal hex from src/theme/weather-scales.ts or the UV bands. */
  color: string;
  kind?: "line" | "area" | "bar";
  dashed?: boolean;
  axis?: "left" | "right";
  /** Area fill or bar opacity. */
  opacity?: number;
  /** One colour per bar (the UV bands), else `color`. */
  barColors?: string[];
};

export type ChartAxisSpec = {
  min?: number;
  max?: number;
  /** A tick as text: "28°", "12 mm". */
  format: (value: number) => string;
};

/**
 * What a detail chart draws, as data. It is drawn by the app's ONE chart,
 * `TimeSeriesChart`, through `chartProps` below: there is no second renderer.
 */
export type ChartSpec = {
  /** The chart's accessible title ("Wind, next 24 hours"). */
  title: string;
  /** One x label per point ("Now", "15:00"). */
  labels: string[];
  series: ChartSeries[];
  left: ChartAxisSpec;
  right?: ChartAxisSpec;
  maxXLabels?: number;
  /** Kept for the specs' tests; the chart always shows its legend row. */
  legend?: boolean;
  /** Plot width over height (default 2, the web's `aspect-[2/1]`). */
  aspect?: number;
};

/** "21°", "60%", "12 km/h": units that are symbols sit on the number. */
export function withUnit(value: number, unit: string): string {
  if (!unit) return String(value);
  return /^[°%]/.test(unit) ? `${value}${unit}` : `${value} ${unit}`;
}

/** A spec as the props of the app's one chart, `TimeSeriesChart`. */
export function chartProps(
  spec: ChartSpec,
  testID?: string,
): TimeSeriesChartProps {
  const data = spec.labels.map((label, i) => {
    const point: Record<string, string | number | null> = { label };
    for (const s of spec.series) point[s.key] = s.values[i] ?? null;
    return point;
  });
  const series: SeriesConfig[] = spec.series.map((s) => ({
    key: s.key,
    label: s.label,
    color: s.color,
    type: s.kind === "bar" ? "bar" : "line",
    fill: s.kind === "area",
    dashed: s.dashed,
    yAxisID: s.axis === "right" ? "right" : "y",
    opacity: s.opacity,
    colorByValue: s.barColors
      ? (_value, index) => s.barColors?.[index] ?? s.color
      : undefined,
  }));
  const units = new Map(spec.series.map((s) => [s.label, s.unit]));
  return {
    title: spec.title,
    data,
    labelKey: "label",
    series,
    yAxes: {
      y: { ...spec.left, position: "left" },
      ...(spec.right ? { right: { ...spec.right, position: "right" } } : {}),
    },
    valueFormat: (label, value) => withUnit(value, units.get(label) ?? ""),
    maxTicksLimit: spec.maxXLabels,
    aspect: spec.aspect,
    testID,
  };
}

/** One reading per hour; a missing one stays `null`, a gap, never a zero. */
const pick = (
  points: readonly MetricSeriesPoint[],
  key: keyof Omit<MetricSeriesPoint, "label">,
): (number | null)[] => points.map((p) => p[key]);

const finite = (values: readonly (number | null)[]): number[] =>
  values.filter((v): v is number => typeof v === "number");

/** The largest reading, or `floor` when there is none. */
const maxOf = (values: readonly (number | null)[], floor = 0) => {
  const real = finite(values);
  return real.length > 0 ? Math.max(...real) : floor;
};
/** The smallest reading, or `ceil` when there is none. */
const minOf = (values: readonly (number | null)[], ceil = 0) => {
  const real = finite(values);
  return real.length > 0 ? Math.min(...real) : ceil;
};

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
            barColors: uv.map((v) => WX_UV[uvBandIndex(v ?? 0)]),
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
