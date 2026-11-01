/** What gets drawn for a chart: the plot box, ticks, labels, paths, bars and gaps. */

import { DEFAULT_AXIS, type SeriesSpec, buildChartModel } from "./chart-model";

const labels = Array.from({ length: 24 }, (_, i) =>
  i === 0 ? "Now" : `${String(i).padStart(2, "0")}:00`,
);

function spec(over: Partial<SeriesSpec> & Pick<SeriesSpec, "key">): SeriesSpec {
  return {
    label: over.key,
    kind: "line",
    fill: false,
    dashed: false,
    axisId: DEFAULT_AXIS,
    order: 1,
    showDots: false,
    values: labels.map((_, i) => 20 + (i % 6)),
    ...over,
  };
}

const base = { width: 320, height: 160, labels, fontSize: 12, maxTicksLimit: 8 };

describe("buildChartModel", () => {
  it("lays the plot inside the labels and puts the points edge to edge for a line", () => {
    const m = buildChartModel({
      ...base,
      series: [spec({ key: "t" })],
      axes: { y: { format: (v) => `${v}°` } },
    });
    expect(m.banded).toBe(false);
    expect(m.plot.left).toBeGreaterThan(0);
    expect(m.plot.width).toBeGreaterThan(0);
    expect(m.plot.left + m.plot.width).toBeLessThanOrEqual(base.width);
    expect(m.plot.top + m.plot.height).toBeLessThan(base.height);
    expect(m.xs[0]).toBe(m.plot.left);
    expect(m.xs[23]).toBeCloseTo(m.plot.left + m.plot.width);
    expect(m.leftTicks.length).toBeGreaterThan(1);
    expect(m.leftTicks[0].text.endsWith("°")).toBe(true);
    expect(m.gridY).toEqual(m.leftTicks.map((t) => t.y));
  });

  it("puts points in the middle of their band when there are bars, and hides a display:false axis", () => {
    const m = buildChartModel({
      ...base,
      series: [
        spec({ key: "t" }),
        spec({ key: "rain", kind: "bar", axisId: "rain", order: 3 }),
      ],
      axes: { rain: { position: "right", min: 0, max: 100, display: false } },
    });
    expect(m.banded).toBe(true);
    expect(m.xs[0]).toBeGreaterThan(m.plot.left);
    expect(m.rightTicks).toEqual([]);
    const bars = m.series.find((s) => s.spec.key === "rain");
    expect(bars?.bars).toHaveLength(24);
  });

  it("draws the lowest order last, so it ends on top", () => {
    const m = buildChartModel({
      ...base,
      series: [
        spec({ key: "a", order: 1 }),
        spec({ key: "b", order: 3 }),
        spec({ key: "c", order: 2 }),
      ],
    });
    expect(m.series.map((s) => s.spec.key)).toEqual(["b", "c", "a"]);
  });

  it("breaks the line at a missing reading and never draws it as zero", () => {
    const values = labels.map((_, i) => (i === 10 ? null : 20 + (i % 4)));
    const m = buildChartModel({
      ...base,
      series: [spec({ key: "t", fill: true, values })],
    });
    const s = m.series[0];
    expect(s.lines).toHaveLength(2);
    expect(s.areas).toHaveLength(2);
    expect(s.points[10]).toBeNull();
    expect(s.points[9]).not.toBeNull();
  });

  it("draws a lone reading as a dot", () => {
    const values = labels.map((_, i) => (i === 5 ? 21 : null));
    const m = buildChartModel({ ...base, series: [spec({ key: "t", values })] });
    expect(m.series[0].dots).toHaveLength(1);
  });

  it("puts dots on solid lines only, as the web does (a dashed line has none)", () => {
    const m = buildChartModel({
      ...base,
      series: [
        spec({ key: "solid", showDots: true }),
        spec({ key: "dashed", showDots: true, dashed: true }),
      ],
    });
    expect(m.series.find((s) => s.spec.key === "solid")?.dots).toHaveLength(24);
    expect(m.series.find((s) => s.spec.key === "dashed")?.dots).toHaveLength(0);
  });

  it("fits the x labels to the plot: fewer when the text is big", () => {
    const small = buildChartModel({ ...base, series: [spec({ key: "t" })] });
    const big = buildChartModel({
      ...base,
      fontSize: 18,
      series: [spec({ key: "t" })],
    });
    expect(small.xLabels[0].index).toBe(0);
    expect(small.xLabels.length).toBeLessThanOrEqual(8);
    expect(big.xLabels.length).toBeLessThanOrEqual(small.xLabels.length);
    expect(small.xLabels[0].text).toBe("Now");
  });

  it("applies xTickFormat to the label text", () => {
    const m = buildChartModel({
      ...base,
      xTickFormat: (l) => l.toUpperCase(),
      series: [spec({ key: "t" })],
    });
    expect(m.xLabels[0].text).toBe("NOW");
  });

  it("has no data when every reading is missing", () => {
    const m = buildChartModel({
      ...base,
      series: [spec({ key: "t", values: labels.map(() => null) })],
    });
    expect(m.hasData).toBe(false);
    expect(m.series[0].lines).toEqual([]);
  });
});
