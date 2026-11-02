/**
 * The geometry and the spoken summary of the agriculture charts: pure, so every
 * rule is unit-tested in Node and the drawing component only paints what this
 * returns.
 *
 * The series, axes and rows are the web's (`AgricultureCharts.tsx` and the five
 * chart components under `src/components/weather/charts/`): a line, bar or area
 * per series, a null is a gap (never drawn as zero), a y-axis with a few round
 * ticks, and a handful of x labels.
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

/** "Nice" tick values spanning `[min, max]`: about `count` steps of 1, 2, 5 x 10^n. */
export function niceTicks(min: number, max: number, count = 3): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0];
  if (max === min) {
    const pad = Math.abs(max) > 0 ? Math.abs(max) * 0.1 : 1;
    min -= pad;
    max += pad;
  }
  const raw = (max - min) / Math.max(1, count);
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const frac = raw / pow;
  const step = (frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10) * pow;
  const first = Math.floor(min / step) * step;
  const last = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = first; v <= last + step / 2; v += step) {
    ticks.push(Math.round(v / step) * step);
  }
  return ticks;
}

/** Numeric values of the given keys across the rows (nulls skipped). */
export function valuesOf(
  rows: readonly AgriChartRow[],
  keys: readonly string[],
): number[] {
  const out: number[] = [];
  for (const r of rows) {
    for (const k of keys) {
      const v = r[k];
      if (typeof v === "number" && Number.isFinite(v)) out.push(v);
    }
  }
  return out;
}

export interface YScale {
  ticks: number[];
  min: number;
  max: number;
}

/**
 * The y scale: the axis's own min and max when it sets them, else round ticks
 * around the data. A bar series is always drawn from zero.
 */
export function yScale(
  rows: readonly AgriChartRow[],
  series: readonly SeriesSpec[],
  axis: AxisSpec,
): YScale {
  const values = valuesOf(
    rows,
    series.map((s) => s.key),
  );
  const hasBars = series.some((s) => s.kind === "bar" || s.kind === "area");
  let lo = values.length ? Math.min(...values) : 0;
  let hi = values.length ? Math.max(...values) : 1;
  if (hasBars) {
    lo = Math.min(lo, 0);
    hi = Math.max(hi, 0);
  }
  if (axis.min !== undefined) lo = axis.min;
  if (axis.max !== undefined) hi = axis.max;
  const ticks = niceTicks(lo, hi);
  return {
    ticks,
    min: axis.min ?? ticks[0],
    max: axis.max ?? ticks[ticks.length - 1],
  };
}

export interface Point {
  x: number;
  y: number;
}

/** Split a series into runs of consecutive non-null points: a gap ends a line. */
export function runsOf(points: readonly (Point | null)[]): Point[][] {
  const runs: Point[][] = [];
  let current: Point[] = [];
  for (const p of points) {
    if (p) current.push(p);
    else if (current.length) {
      runs.push(current);
      current = [];
    }
  }
  if (current.length) runs.push(current);
  return runs;
}

/** `M x y L x y ...` for a run of points. */
export function linePath(run: readonly Point[]): string {
  return run
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
}

/** The same run closed down to the baseline, for an area. */
export function areaPath(run: readonly Point[], baseline: number): string {
  if (run.length === 0) return "";
  const first = run[0];
  const last = run[run.length - 1];
  return `${linePath(run)} L${last.x.toFixed(1)} ${baseline.toFixed(1)} L${first.x.toFixed(1)} ${baseline.toFixed(1)} Z`;
}

/** Up to `max` evenly spread indices of `count` labels, always including the first and last. */
export function labelIndices(count: number, max: number): number[] {
  if (count <= 0) return [];
  if (count <= max) return Array.from({ length: count }, (_, i) => i);
  const out = new Set<number>();
  for (let i = 0; i < max; i++) {
    out.add(Math.round((i * (count - 1)) / (max - 1)));
  }
  return [...out].sort((a, b) => a - b);
}

export interface BarRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ChartGeometry {
  scale: YScale;
  /** Pixel y of each y tick, with its text. */
  yTicks: { y: number; label: string }[];
  /** Pixel x of each x label, with its text. */
  xTicks: { x: number; label: string }[];
  /** Per series: its line runs, area runs and bar rectangles. */
  series: {
    spec: SeriesSpec;
    runs: Point[][];
    bars: BarRect[];
    areas: string[];
  }[];
  /** The pixel y of the value 0 (or the plot's floor when 0 is off the scale). */
  baseline: number;
}

export interface ChartBox {
  width: number;
  height: number;
  /** Room kept for the x labels under the plot. */
  footer: number;
  /** The share of a slot a bar leaves empty. */
  barGap: number;
  maxXLabels: number;
}

/** Everything the drawing needs, from the rows and a pixel box. */
export function chartGeometry(
  rows: readonly AgriChartRow[],
  series: readonly SeriesSpec[],
  axis: AxisSpec,
  box: ChartBox,
  labelKey = "date",
): ChartGeometry {
  const scale = yScale(rows, series, axis);
  const plotH = Math.max(1, box.height - box.footer);
  const span = scale.max - scale.min || 1;
  const yOf = (v: number) => plotH - ((v - scale.min) / span) * plotH;
  const n = rows.length;
  const slot = n > 0 ? box.width / n : box.width;
  const xOf = (i: number) => slot * i + slot / 2;
  const zero = Math.min(plotH, Math.max(0, yOf(0)));
  const baseline = scale.min <= 0 && scale.max >= 0 ? zero : plotH;

  const built = series.map((spec) => {
    const pts = rows.map((r, i) => {
      const v = r[spec.key];
      return typeof v === "number" && Number.isFinite(v)
        ? { x: xOf(i), y: yOf(v) }
        : null;
    });
    const kind = spec.kind ?? "line";
    const runs = kind === "bar" ? [] : runsOf(pts);
    const bars: BarRect[] = [];
    if (kind === "bar") {
      const w = slot * (1 - box.barGap);
      pts.forEach((p) => {
        if (!p) return;
        const top = Math.min(p.y, baseline);
        bars.push({
          x: p.x - w / 2,
          y: top,
          width: w,
          height: Math.max(1, Math.abs(baseline - p.y)),
        });
      });
    }
    const areas = kind === "area" ? runs.map((r) => areaPath(r, baseline)) : [];
    return { spec, runs, bars, areas };
  });

  const labels = rows.map((r) => String(r[labelKey] ?? ""));
  return {
    scale,
    yTicks: scale.ticks.map((v) => ({ y: yOf(v), label: axis.format(v) })),
    xTicks: labelIndices(n, box.maxXLabels).map((i) => ({
      x: xOf(i),
      label: labels[i],
    })),
    series: built,
    baseline,
  };
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
