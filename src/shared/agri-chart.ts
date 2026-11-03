/**
 * The agriculture charts' series and axis specs, and their spoken summary:
 * pure, so every rule is unit-tested in Node. The drawing is the app's one
 * chart, `TimeSeriesChart`, through `AgriSeriesChart`.
 *
 * The series, axes and rows are the web's (`AgricultureCharts.tsx` and the five
 * chart components under `src/components/weather/charts/`): a line, bar or area
 * per series, a null is a gap (never drawn as zero).
 */

import type { AgriChartRow } from "./agriculture";

export type SeriesKind = "line" | "bar" | "area";

export interface SeriesSpec {
  key: string;
  label: string;
  kind?: SeriesKind;
  dashed?: boolean;
  /** Fill opacity of a bar or an area, 0 to 1 (a line is drawn solid). */
  opacity?: number;
  /** Which palette entry draws it (the screens map this to a colour). */
  tone: string;
}

export interface AxisSpec {
  min?: number;
  max?: number;
  /** Text of a tick and of a value in the spoken summary. */
  format: (value: number) => string;
}

/**
 * What VoiceOver reads for a chart: its title, how many days it spans, and for
 * each series its lowest and highest value with the day it happened. A series
 * with no value says so rather than reading zero.
 */
export function describeChart(
  title: string,
  rows: readonly AgriChartRow[],
  series: readonly SeriesSpec[],
  axis: AxisSpec,
  labelKey = "date",
): string {
  const n = rows.length;
  const parts = [
    n > 0
      ? `${title}. ${n} days, ${String(rows[0][labelKey])} to ${String(rows[n - 1][labelKey])}.`
      : `${title}. No data.`,
  ];
  for (const s of series) {
    let lo: { v: number; at: string } | null = null;
    let hi: { v: number; at: string } | null = null;
    for (const r of rows) {
      const v = r[s.key];
      if (typeof v !== "number" || !Number.isFinite(v)) continue;
      const at = String(r[labelKey] ?? "");
      if (!lo || v < lo.v) lo = { v, at };
      if (!hi || v > hi.v) hi = { v, at };
    }
    parts.push(
      lo && hi
        ? `${s.label}: lowest ${axis.format(lo.v)} on ${lo.at}, highest ${axis.format(hi.v)} on ${hi.at}.`
        : `${s.label}: no data.`,
    );
  }
  return parts.join(" ");
}
