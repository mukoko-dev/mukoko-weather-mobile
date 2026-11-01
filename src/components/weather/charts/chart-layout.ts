/**
 * The geometry of a time-series chart, with no drawing in it: axes, ticks, the
 * x positions, smooth line and area paths, bars, and which point a touch lands
 * on. `TimeSeriesChart` only paints what this returns, so every rule here is a
 * plain function with a test.
 *
 * It mirrors what the web's Chart.js config does (mukoko-weather
 * `src/components/weather/charts/TimeSeriesChart.tsx`): a category x axis with
 * the first and last point on the plot edges (points sit in the middle of a
 * band instead when the chart has bars), a linear y axis per `yAxisID` with
 * optional min and max, areas filled down to zero (or the nearest edge of the
 * axis), bars that start at zero, and a missing reading drawn as a gap.
 *
 * Lines are smoothed with a monotone cubic curve (Fritsch-Carlson). Chart.js
 * uses a tension of 0.4; the monotone curve looks the same and never swings
 * past a data point, so a chart cannot show a temperature that was not
 * forecast.
 */

export type Reading = number | null;

export type Point = { x: number; y: number };

export type AxisConfig = {
  min?: number;
  max?: number;
  position?: "left" | "right";
  display?: boolean;
  format?: (v: number) => string;
};

export type Domain = { min: number; max: number };

/** Round away binary noise: 0.1 + 0.2 is 0.3 on an axis. */
function clean(v: number, step: number): number {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  return Number(v.toFixed(Math.min(decimals, 8)));
}

/** A round step (1, 2, 5 times a power of ten) that gives about `target` ticks over `range`. */
export function niceStep(range: number, target: number): number {
  const raw = range / Math.max(1, target);
  if (!(raw > 0) || !Number.isFinite(raw)) return 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * mag;
}

/** Most tick labels an axis draws. */
export const MAX_TICKS = 7;

/**
 * Round tick values inside `[min, max]`: the smallest round step (1, 2 or 5
 * times a power of ten) that gives no more than `maxTicks` of them.
 */
export function niceTicks(min: number, max: number, maxTicks = MAX_TICKS): number[] {
  if (!(max > min)) return [min];
  const range = max - min;
  const unit = 10 ** (Math.floor(Math.log10(range)) - 2);
  for (let k = 0; k < 8; k++) {
    for (const m of [1, 2, 5]) {
      const step = m * unit * 10 ** k;
      const first = Math.ceil(min / step - 1e-9) * step;
      const ticks: number[] = [];
      for (let v = first; v <= max + step * 1e-9; v += step) {
        ticks.push(clean(v, step));
      }
      if (ticks.length <= maxTicks) return ticks;
    }
  }
  return [min, max];
}

/** Every finite number in a list of readings. */
export function finite(values: readonly Reading[]): number[] {
  return values.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );
}

/**
 * The y range of an axis: the configured min and max, else the data's own
 * range rounded out to round numbers. Bars start at zero unless a min is
 * given. A flat series gets a unit either side so it has height. `null` when
 * there is nothing to plot.
 */
export function resolveDomain(
  values: readonly Reading[],
  config: Pick<AxisConfig, "min" | "max"> | undefined,
  hasBars: boolean,
): Domain | null {
  const data = finite(values);
  const lowIn = typeof config?.min === "number" ? config.min : undefined;
  const highIn = typeof config?.max === "number" ? config.max : undefined;
  if (data.length === 0 && (lowIn === undefined || highIn === undefined)) {
    return null;
  }
  let lo = data.length ? Math.min(...data) : (lowIn ?? 0);
  let hi = data.length ? Math.max(...data) : (highIn ?? 1);
  if (hasBars && lowIn === undefined) lo = Math.min(lo, 0);
  const step = niceStep(hi - lo || 1, 4);
  if (lowIn !== undefined) lo = lowIn;
  else lo = Math.floor(lo / step + 1e-9) * step;
  if (highIn !== undefined) hi = highIn;
  else hi = Math.ceil(hi / step - 1e-9) * step;
  if (!(hi > lo)) {
    lo -= 1;
    hi += 1;
  }
  return { min: lo, max: hi };
}

/** Where a value falls between `top` (the domain max) and `top + height` (its min). */
export function yOf(
  v: number,
  domain: Domain,
  top: number,
  height: number,
): number {
  return top + ((domain.max - v) / (domain.max - domain.min)) * height;
}

/**
 * The x of point `i` of `count`. A line chart puts the first and last point on
 * the plot edges; with bars each point sits in the middle of its band.
 */
export function xAt(
  i: number,
  count: number,
  left: number,
  width: number,
  banded: boolean,
): number {
  if (count <= 1) return left + width / 2;
  return banded
    ? left + (width * (i + 0.5)) / count
    : left + (width * i) / (count - 1);
}

/** Index of the point nearest to `x`, or -1 when there are no points. */
export function nearestIndex(x: number, xs: readonly number[]): number {
  let best = -1;
  let bestDist = Infinity;
  xs.forEach((px, i) => {
    const d = Math.abs(px - x);
    if (d < bestDist) {
      best = i;
      bestDist = d;
    }
  });
  return best;
}

/**
 * The indices of runs of consecutive points that have a reading. A gap (null)
 * ends a run, so a missing hour is a break in the line, not a drop to zero.
 */
export function runsOf(values: readonly Reading[]): number[][] {
  const runs: number[][] = [];
  let run: number[] = [];
  values.forEach((v, i) => {
    if (typeof v === "number" && Number.isFinite(v)) run.push(i);
    else if (run.length) {
      runs.push(run);
      run = [];
    }
  });
  if (run.length) runs.push(run);
  return runs;
}

const r = (n: number) => Math.round(n * 100) / 100;

/** A monotone cubic curve through the points as an SVG path (`M` then `C` segments). */
export function linePath(pts: readonly Point[]): string {
  if (pts.length === 0) return "";
  const first = pts[0];
  if (pts.length === 1) return `M${r(first.x)} ${r(first.y)}`;
  const n = pts.length;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1].x - pts[i].x);
    slope.push(dx[i] === 0 ? 0 : (pts[i + 1].y - pts[i].y) / dx[i]);
  }
  const m: number[] = new Array(n).fill(0);
  m[0] = slope[0];
  m[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = slope[i - 1] * slope[i] > 0 ? (slope[i - 1] + slope[i]) / 2 : 0;
  }
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * slope[i];
      m[i + 1] = t * b * slope[i];
    }
  }
  let d = `M${r(first.x)} ${r(first.y)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    const c1 = { x: pts[i].x + h, y: pts[i].y + m[i] * h };
    const c2 = { x: pts[i + 1].x - h, y: pts[i + 1].y - m[i + 1] * h };
    d += ` C${r(c1.x)} ${r(c1.y)} ${r(c2.x)} ${r(c2.y)} ${r(pts[i + 1].x)} ${r(pts[i + 1].y)}`;
  }
  return d;
}

/** The filled area under a run: the curve, then down to `baseY` and back. */
export function areaPath(pts: readonly Point[], baseY: number): string {
  if (pts.length < 2) return "";
  const last = pts[pts.length - 1];
  return `${linePath(pts)} L${r(last.x)} ${r(baseY)} L${r(pts[0].x)} ${r(baseY)} Z`;
}

/** Chart.js `barPercentage` and `categoryPercentage` defaults. */
export const BAR_PERCENTAGE = 0.9;
export const CATEGORY_PERCENTAGE = 0.8;

export type Bar = {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

/** The bars of one series: from the zero line (clamped into the axis) to the value. */
export function barsOf(
  values: readonly Reading[],
  domain: Domain,
  left: number,
  plotWidth: number,
  top: number,
  plotHeight: number,
): Bar[] {
  const count = values.length;
  const band = count > 0 ? plotWidth / count : 0;
  const width = Math.max(1, band * BAR_PERCENTAGE * CATEGORY_PERCENTAGE);
  const baseline = yOf(
    Math.min(Math.max(0, domain.min), domain.max),
    domain,
    top,
    plotHeight,
  );
  const bars: Bar[] = [];
  values.forEach((v, index) => {
    if (typeof v !== "number" || !Number.isFinite(v)) return;
    const y = yOf(Math.min(Math.max(v, domain.min), domain.max), domain, top, plotHeight);
    const cx = xAt(index, count, left, plotWidth, true);
    bars.push({
      index,
      x: cx - width / 2,
      y: Math.min(y, baseline),
      width,
      height: Math.max(Math.abs(baseline - y), 1),
    });
  });
  return bars;
}

/**
 * The indices of the x labels to draw: evenly spread, at most `max` of them,
 * always starting with the first (Chart.js `autoSkip`).
 */
export function labelIndices(count: number, max: number): number[] {
  if (count <= 0) return [];
  const limit = Math.max(1, Math.floor(max));
  const step = Math.max(1, Math.ceil(count / limit));
  const out: number[] = [];
  for (let i = 0; i < count; i += step) out.push(i);
  return out;
}

/** The label step that keeps labels about `labelWidth` wide from touching on `plotWidth`. */
export function maxLabelsFitting(
  plotWidth: number,
  labelWidth: number,
  limit: number,
): number {
  if (!(labelWidth > 0)) return limit;
  return Math.max(2, Math.min(limit, Math.floor(plotWidth / (labelWidth * 1.4))));
}

/** A rough width of a label in dp, from its length and the type size. */
export function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.62;
}

/**
 * The range of some readings widened by `pad` each side, for an axis the chart
 * sets itself (the web's `Math.min(...) - 2`, `Math.max(...) + 2`). A reading
 * that is missing is left out; with none at all, `fallback` is returned.
 */
export function paddedRange(
  values: readonly Reading[],
  pad: number,
  fallback: Domain,
): Domain {
  const data = finite(values);
  if (data.length === 0) return fallback;
  return { min: Math.min(...data) - pad, max: Math.max(...data) + pad };
}
