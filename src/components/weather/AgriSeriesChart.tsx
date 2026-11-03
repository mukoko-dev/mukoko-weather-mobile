/**
 * A multi-series chart for the agriculture page: lines, bars and areas over
 * the 16 forecast days (or 46 days of growing degree days). A thin config of
 * the app's one chart, `TimeSeriesChart`: the cards hand it rows, series specs
 * and an axis, and the one chart draws them (touch readout, gaps that stay
 * gaps, a legend in words, Reduce Motion), as every other chart does.
 *
 * VoiceOver hears the title, the span and each series' lowest and highest
 * value with its day (`describeChart` in src/shared/agri-chart.ts).
 */

import { useMemo } from "react";

import { useFarmColors } from "@/hooks/useFarmColors";
import {
  type AxisSpec,
  type SeriesSpec,
  describeChart,
} from "@/shared/agri-chart";
import { type AgriChartRow } from "@/shared/agriculture";
import { type FarmColors } from "@/theme/farm";

import { type SeriesConfig, TimeSeriesChart } from "./charts/TimeSeriesChart";

/** The palette a series `tone` names. */
export function toneColor(farm: FarmColors, tone: string): string {
  switch (tone) {
    case "rain":
      return farm.series.rain;
    case "terracotta":
      return farm.series.terracotta;
    case "cobalt":
      return farm.series.cobalt;
    case "sodalite":
      return farm.series.sodalite;
    case "gold":
      return farm.series.gold;
    case "earth":
      return farm.series.earth;
    default:
      return farm.malachite;
  }
}

/** Most x labels drawn; more would touch on a narrow phone. */
const MAX_X_LABELS = 5;

export type AgriSeriesChartProps = {
  title: string;
  rows: AgriChartRow[];
  series: SeriesSpec[];
  axis: AxisSpec;
  testID?: string;
};

/** The lowest reading of the series, or null when there is none. */
function lowest(rows: readonly AgriChartRow[], series: readonly SeriesSpec[]) {
  let lo: number | null = null;
  for (const r of rows) {
    for (const s of series) {
      const v = r[s.key];
      if (
        typeof v === "number" &&
        Number.isFinite(v) &&
        (lo === null || v < lo)
      )
        lo = v;
    }
  }
  return lo;
}

export function AgriSeriesChart({
  title,
  rows,
  series,
  axis,
  testID = "agri-chart",
}: AgriSeriesChartProps) {
  const farm = useFarmColors();
  const config = useMemo<SeriesConfig[]>(
    () =>
      series.map((s) => ({
        key: s.key,
        label: s.label,
        color: toneColor(farm, s.tone),
        type: s.kind === "bar" ? "bar" : "line",
        fill: s.kind === "area",
        dashed: s.dashed,
        opacity: s.opacity,
      })),
    [series, farm],
  );
  // An area is filled down to zero, as a bar is: its axis starts at zero
  // unless the data goes below it (a water deficit) or the axis says otherwise.
  const hasArea = series.some((s) => s.kind === "area");
  const lo = lowest(rows, series);
  const min = axis.min ?? (hasArea ? Math.min(0, lo ?? 0) : undefined);
  const full = describeChart(title, rows, series, axis);
  return (
    <TimeSeriesChart
      title={title}
      summary={
        full.startsWith(`${title}. `) ? full.slice(title.length + 2) : full
      }
      data={rows}
      labelKey="date"
      series={config}
      yAxes={{ y: { min, max: axis.max, format: axis.format } }}
      valueFormat={(_label, value) => axis.format(value)}
      maxTicksLimit={MAX_X_LABELS}
      testID={testID}
    />
  );
}
