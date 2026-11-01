/**
 * Chart geometry for the small time-series charts on the cards and detail
 * sheets (wind, UV, feels like, rain, humidity, pressure, the monthly
 * normals, the model lines). Pure: it turns values into axis ticks, paths and
 * bars in the plot's own pixels, and into the sentence a screen reader gets.
 * The web draws these on a canvas (Chart.js `TimeSeriesChart`); the phone draws
 * the same series with react-native-svg from this geometry.
 *
 * A missing value is `null` and is a GAP in a line, never a zero.
 */

export type Maybe = number | null | undefined;

const finite = (v: Maybe): v is number =>
  typeof v === "number" && Number.isFinite(v);

/** Smallest and largest finite value, or `null` when there is none. */
export function extent(values: readonly Maybe[]): [number, number] | null {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (!finite(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return lo === Infinity ? null : [lo, hi];
}

/** The "nice" step (1, 2, 2.5, 5 times a power of ten) for about `count` ticks. */
export function niceStep(range: number, count: number): number {
  const rough = range / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / mag;
  const f = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return f * mag;
}

export interface Axis {
  min: number;
  max: number;
  /** Tick values, ascending, all inside [min, max]. */
  ticks: number[];
}

export interface AxisSpec {
  /** Fixed lower bound; otherwise the data's, padded out to a tick. */
  min?: number;
  /** Fixed upper bound; otherwise the data's, padded out to a tick. */
  max?: number;
}

/** Rounded to 6 places, and never -0. */
const round6 = (n: number) => Math.round(n * 1e6) / 1e6 + 0;

/**
 * The axis for some values. A fixed bound is kept exactly; a free one is
 * widened to the next tick so the data never touches the frame. A flat series
 * (every value equal) still gets a range, so it draws as a line, not a point.
 */
export function resolveAxis(
  values: readonly Maybe[],
  spec: AxisSpec = {},
  tickCount = 4,
): Axis {
  const data = extent(values) ?? [0, 1];
  let lo = spec.min ?? data[0];
  let hi = spec.max ?? data[1];
  if (hi - lo < 1e-9) {
    // Flat: open a symmetric window around the value (or up from a fixed floor).
    const pad = Math.max(1, Math.abs(hi) * 0.1);
    if (spec.min === undefined) lo -= pad;
    if (spec.max === undefined) hi += pad;
    if (hi - lo < 1e-9) hi = lo + 1;
  }
  const step = niceStep(hi - lo, tickCount);
  if (spec.min === undefined) lo = Math.floor(lo / step) * step;
  if (spec.max === undefined) hi = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  const first = Math.ceil(lo / step - 1e-9) * step;
  for (let t = first; t <= hi + 1e-9; t += step) ticks.push(round6(t));
  return { min: round6(lo), max: round6(hi), ticks };
}

/** Where a value sits on the axis, 0 (min) to 1 (max), clamped. */
export function fraction(value: number, axis: Axis): number {
  const span = axis.max - axis.min;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (value - axis.min) / span));
}

/**
 * Indices of the x labels to print: the first, the last and evenly spaced ones
 * between, at most `maxTicks`, so labels never touch.
 */
export function xTickIndices(count: number, maxTicks: number): number[] {
  if (count <= 0 || maxTicks <= 0) return [];
  if (count <= maxTicks) return Array.from({ length: count }, (_, i) => i);
  if (maxTicks === 1) return [0];
  const out = new Set<number>();
  for (let k = 0; k < maxTicks; k++) {
    out.add(Math.round((k * (count - 1)) / (maxTicks - 1)));
  }
  return [...out].sort((a, b) => a - b);
}

export interface Plot {
  width: number;
  height: number;
  /** Bars sit in the middle of their slot, and lines through them line up. */
  centered: boolean;
}

/** The x of point `i` of `count`, in plot pixels. */
export function xAt(i: number, count: number, plot: Plot): number {
  if (count <= 1) return plot.width / 2;
  if (plot.centered) return ((i + 0.5) / count) * plot.width;
  return (i / (count - 1)) * plot.width;
}

/** The y of a value, in plot pixels (0 at the top). */
export function yAt(value: number, axis: Axis, plot: Plot): number {
  return plot.height * (1 - fraction(value, axis));
}

const f2 = (n: number) => Math.round(n * 100) / 100;

/** Runs of consecutive finite points, so a gap breaks the line. */
function runs(values: readonly Maybe[]): number[][] {
  const out: number[][] = [];
  let cur: number[] = [];
  values.forEach((v, i) => {
    if (finite(v)) cur.push(i);
    else if (cur.length > 0) {
      out.push(cur);
      cur = [];
    }
  });
  if (cur.length > 0) out.push(cur);
  return out;
}

/** One SVG path per run of values ("M x y L x y ..."); a lone point is a dot. */
export function linePaths(
  values: readonly Maybe[],
  axis: Axis,
  plot: Plot,
): { d: string; dot: boolean }[] {
  return runs(values).map((run) => {
    const pts = run.map((i) => {
      const x = f2(xAt(i, values.length, plot));
      const y = f2(yAt(values[i] as number, axis, plot));
      return `${x} ${y}`;
    });
    return { d: `M ${pts.join(" L ")}`, dot: run.length === 1 };
  });
}

/** The filled area under each run, closed down to the baseline. */
export function areaPaths(
  values: readonly Maybe[],
  axis: Axis,
  plot: Plot,
): string[] {
  const baseline = f2(yAt(Math.max(axis.min, Math.min(0, axis.max)), axis, plot));
  return runs(values)
    .filter((run) => run.length > 1)
    .map((run) => {
      const pts = run.map((i) => {
        const x = f2(xAt(i, values.length, plot));
        const y = f2(yAt(values[i] as number, axis, plot));
        return `${x} ${y}`;
      });
      const x0 = f2(xAt(run[0], values.length, plot));
      const x1 = f2(xAt(run[run.length - 1], values.length, plot));
      return `M ${x0} ${baseline} L ${pts.join(" L ")} L ${x1} ${baseline} Z`;
    });
}

export interface Bar {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Fraction of a slot a bar fills. */
export const BAR_FILL = 0.7;
/** A bar with a value is never thinner than this many pixels tall. */
export const MIN_BAR_PX = 2;

/** One bar per finite value, from the axis floor (or zero) up to the value. */
export function barRects(
  values: readonly Maybe[],
  axis: Axis,
  plot: Plot,
): Bar[] {
  const slot = plot.width / Math.max(1, values.length);
  const width = Math.max(1, slot * BAR_FILL);
  const baseValue = Math.max(axis.min, Math.min(0, axis.max));
  const base = yAt(baseValue, axis, plot);
  const bars: Bar[] = [];
  values.forEach((v, i) => {
    if (!finite(v)) return;
    const top = yAt(v, axis, plot);
    const height = Math.max(MIN_BAR_PX, Math.abs(base - top));
    bars.push({
      index: i,
      x: f2((i + 0.5) * slot - width / 2),
      y: f2(v >= baseValue ? base - height : base),
      width: f2(width),
      height: f2(height),
    });
  });
  return bars;
}

export interface DescribedSeries {
  label: string;
  unit: string;
  values: readonly Maybe[];
}

const trim = (n: number) =>
  Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);

/**
 * What a screen reader hears for a chart: for each series, where it starts and
 * ends, and its lowest and highest value with the label at that point.
 * `labels` are the x labels ("Now", "15:00").
 */
export function describeSeries(
  title: string,
  series: readonly DescribedSeries[],
  labels: readonly string[],
): string {
  const parts = series.map((s) => {
    const idx = s.values
      .map((v, i) => [v, i] as const)
      .filter((p): p is readonly [number, number] => finite(p[0]));
    if (idx.length === 0) return `${s.label}: no data`;
    const first = idx[0];
    const last = idx[idx.length - 1];
    const lowest = idx.reduce((a, b) => (b[0] < a[0] ? b : a));
    const highest = idx.reduce((a, b) => (b[0] > a[0] ? b : a));
    const at = (i: number) => (labels[i] ? ` at ${labels[i]}` : "");
    const u = s.unit ? ` ${s.unit}` : "";
    if (idx.length === 1) return `${s.label}: ${trim(first[0])}${u}${at(first[1])}`;
    return (
      `${s.label}: from ${trim(first[0])}${u}${at(first[1])} to ${trim(last[0])}${u}${at(last[1])}; ` +
      `lowest ${trim(lowest[0])}${u}${at(lowest[1])}, highest ${trim(highest[0])}${u}${at(highest[1])}`
    );
  });
  return `${title}. ${parts.join(". ")}.`;
}
