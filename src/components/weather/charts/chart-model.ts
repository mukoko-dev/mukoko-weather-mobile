/**
 * Turns a chart's data and series configs into everything that gets drawn, in
 * the chart's own pixel space: the plot box, grid lines, tick labels, each
 * series' paths, bars and dots, and the x of every point. No colours (the
 * component paints with the theme) and no React.
 */

import {
  type AxisConfig,
  type Bar,
  type Domain,
  type Point,
  type Reading,
  areaPath,
  barsOf,
  estimateTextWidth,
  labelIndices,
  linePath,
  maxLabelsFitting,
  niceTicks,
  resolveDomain,
  runsOf,
  xAt,
  yOf,
} from "./chart-layout";

/** The axis a series is on when it names none, as on the web. */
export const DEFAULT_AXIS = "y";

export type SeriesSpec = {
  key: string;
  label: string;
  kind: "line" | "bar";
  fill: boolean;
  dashed: boolean;
  axisId: string;
  /** Lower draws on top (Chart.js `order`). */
  order: number;
  showDots: boolean;
  values: Reading[];
};

export type ChartInput = {
  width: number;
  height: number;
  labels: readonly string[];
  series: readonly SeriesSpec[];
  axes?: Record<string, AxisConfig>;
  /** The label type size in dp (it follows the person's text size). */
  fontSize: number;
  maxTicksLimit: number;
  xTickFormat?: (label: string, index: number) => string;
};

export type Tick = { value: number; y: number; text: string };
export type XLabel = { index: number; x: number; text: string };

export type DrawnSeries = {
  spec: SeriesSpec;
  /** One path per run of consecutive readings. */
  lines: string[];
  areas: string[];
  bars: Bar[];
  dots: Point[];
  /** The point of each index, or null for a gap. */
  points: (Point | null)[];
};

export type ChartModel = {
  width: number;
  height: number;
  plot: { left: number; top: number; width: number; height: number };
  banded: boolean;
  xs: number[];
  gridY: number[];
  leftTicks: Tick[];
  rightTicks: Tick[];
  xLabels: XLabel[];
  /** In draw order: highest `order` first, so the lowest ends on top. */
  series: DrawnSeries[];
  hasData: boolean;
};

const AXIS_GAP = 8;
const EDGE_PAD = 6;

function formatTick(v: number, axis: AxisConfig | undefined): string {
  return axis?.format ? axis.format(v) : String(v);
}

type ResolvedAxis = {
  id: string;
  config: AxisConfig;
  domain: Domain | null;
  ticks: number[];
};

export function buildChartModel(input: ChartInput): ChartModel {
  const { width, height, labels, series, fontSize } = input;
  const count = labels.length;
  const banded = series.some((s) => s.kind === "bar");

  // Axes: one per id the series use, with its domain from those series' data.
  const ids = Array.from(new Set(series.map((s) => s.axisId)));
  const axes: ResolvedAxis[] = ids.map((id) => {
    const config = input.axes?.[id] ?? {};
    const own = series.filter((s) => s.axisId === id);
    const domain = resolveDomain(
      own.flatMap((s) => s.values),
      config,
      own.some((s) => s.kind === "bar"),
    );
    return {
      id,
      config,
      domain,
      ticks: domain ? niceTicks(domain.min, domain.max) : [],
    };
  });
  const shown = (a: ResolvedAxis) => a.config.display !== false;
  const isRight = (a: ResolvedAxis) => a.config.position === "right";
  const left = axes.find((a) => shown(a) && !isRight(a));
  const right = axes.find((a) => shown(a) && isRight(a));

  // The plot box leaves room for the tick labels around it.
  const widest = (a: ResolvedAxis | undefined) =>
    a
      ? Math.max(
          0,
          ...a.ticks.map((t) =>
            estimateTextWidth(formatTick(t, a.config), fontSize),
          ),
        )
      : 0;
  const gutterLeft = left ? widest(left) + AXIS_GAP : EDGE_PAD;
  const gutterRight = right ? widest(right) + AXIS_GAP : EDGE_PAD;
  const top = Math.ceil(fontSize / 2) + 2;
  const bottom = Math.ceil(fontSize * 1.2) + AXIS_GAP;
  const plot = {
    left: gutterLeft,
    top,
    width: Math.max(0, width - gutterLeft - gutterRight),
    height: Math.max(0, height - top - bottom),
  };

  const xs = Array.from({ length: count }, (_, i) =>
    xAt(i, count, plot.left, plot.width, banded),
  );

  const tickOf = (a: ResolvedAxis): Tick[] =>
    a.domain
      ? a.ticks.map((value) => ({
          value,
          y: yOf(value, a.domain as Domain, plot.top, plot.height),
          text: formatTick(value, a.config),
        }))
      : [];
  const leftTicks = left ? tickOf(left) : [];
  const rightTicks = right ? tickOf(right) : [];
  // Grid lines follow the left axis, else the right one.
  const gridY = (leftTicks.length ? leftTicks : rightTicks).map((t) => t.y);

  // X labels: as many as fit without touching.
  const texts = labels.map((l, i) =>
    input.xTickFormat ? input.xTickFormat(l, i) : l,
  );
  const labelWidth = Math.max(
    0,
    ...texts.map((t) => estimateTextWidth(t, fontSize)),
  );
  const fit = maxLabelsFitting(plot.width, labelWidth, input.maxTicksLimit);
  const xLabels: XLabel[] = labelIndices(count, fit).map((index) => ({
    index,
    x: xs[index],
    text: texts[index],
  }));

  const drawn: DrawnSeries[] = [...series]
    .sort((a, b) => b.order - a.order)
    .map((spec) => {
      const axis = axes.find((a) => a.id === spec.axisId);
      const domain = axis?.domain ?? null;
      const empty: DrawnSeries = {
        spec,
        lines: [],
        areas: [],
        bars: [],
        dots: [],
        points: spec.values.map(() => null),
      };
      if (!domain) return empty;
      const points = spec.values.map((v, i): Point | null =>
        typeof v === "number" && Number.isFinite(v)
          ? { x: xs[i], y: yOf(v, domain, plot.top, plot.height) }
          : null,
      );
      if (spec.kind === "bar") {
        return {
          ...empty,
          points,
          bars: barsOf(
            spec.values,
            domain,
            plot.left,
            plot.width,
            plot.top,
            plot.height,
          ),
        };
      }
      const baseY = yOf(
        Math.min(Math.max(0, domain.min), domain.max),
        domain,
        plot.top,
        plot.height,
      );
      const lines: string[] = [];
      const areas: string[] = [];
      const dots: Point[] = [];
      for (const run of runsOf(spec.values)) {
        const pts = run.map((i) => points[i] as Point);
        lines.push(linePath(pts));
        if (spec.fill) areas.push(areaPath(pts, baseY));
        // A lone reading has no line, so it is drawn as a dot.
        if (pts.length === 1 || (spec.showDots && !spec.dashed)) {
          dots.push(...pts);
        }
      }
      return { ...empty, points, lines, areas, dots };
    });

  return {
    width,
    height,
    plot,
    banded,
    xs,
    gridY,
    leftTicks,
    rightTicks,
    xLabels,
    series: drawn,
    hasData: drawn.some((s) => s.points.some((p) => p !== null)),
  };
}
