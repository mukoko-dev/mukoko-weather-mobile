import agricultureHarare from "@/api/__fixtures__/agriculture-harare.json";

import {
  type AxisSpec,
  type ChartBox,
  type SeriesSpec,
  areaPath,
  chartGeometry,
  describeChart,
  labelIndices,
  linePath,
  niceTicks,
  runsOf,
  valuesOf,
  yScale,
} from "./agri-chart";
import { type AgricultureResponse, forecastChartRows } from "./agriculture";

const rows = forecastChartRows(
  (agricultureHarare as unknown as AgricultureResponse).daily,
);
const mm: AxisSpec = { min: 0, format: (v) => `${v} mm` };
const BOX: ChartBox = {
  width: 320,
  height: 176,
  footer: 24,
  barGap: 0.3,
  maxXLabels: 5,
};
const rain: SeriesSpec = {
  key: "rainMm",
  label: "Rain",
  kind: "bar",
  tone: "rain",
};
const et0: SeriesSpec = { key: "et0Mm", label: "ET₀", tone: "terracotta" };

describe("niceTicks", () => {
  it("uses round steps (1, 2, 5 x 10^n) that span the data", () => {
    expect(niceTicks(0, 10)).toEqual([0, 5, 10]);
    expect(niceTicks(0, 100)).toEqual([0, 50, 100]);
    expect(niceTicks(0, 4.2)).toEqual([0, 2, 4, 6]);
    expect(niceTicks(-12, 18)).toEqual([-20, -10, 0, 10, 20]);
    expect(niceTicks(0, 0.8)).toEqual([0, 0.5, 1]);
  });

  it("pads a flat series instead of dividing by zero", () => {
    const t = niceTicks(5, 5);
    expect(t[0]).toBeLessThan(5);
    expect(t[t.length - 1]).toBeGreaterThan(5);
  });

  it("survives a non-number", () => {
    expect(niceTicks(Number.NaN, 4)).toEqual([0]);
  });
});

describe("valuesOf and yScale", () => {
  it("skips nulls, never reading them as zero", () => {
    expect(
      valuesOf([{ a: 1 }, { a: null }, { a: 3 }, { a: "x" }], ["a"]),
    ).toEqual([1, 3]);
  });

  it("starts a bar series at zero and honours the axis's own bounds", () => {
    const s = yScale(rows, [rain, et0], mm);
    expect(s.min).toBe(0);
    expect(s.max).toBeGreaterThanOrEqual(
      Math.max(...valuesOf(rows, ["rainMm", "et0Mm"])),
    );
    expect(
      yScale(rows, [rain], { min: 0, max: 24, format: String }),
    ).toMatchObject({
      min: 0,
      max: 24,
    });
  });

  it("lets a line series sit above zero (a temperature does not start at 0)", () => {
    const line: SeriesSpec = { key: "t", label: "T", tone: "x" };
    const s = yScale([{ t: 18 }, { t: 30 }], [line], { format: String });
    expect(s.min).toBeGreaterThan(0);
  });
});

describe("runs and paths", () => {
  it("ends a line at a gap, and keeps a lone point as its own run", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 1, y: 1 };
    const c = { x: 3, y: 2 };
    expect(runsOf([a, b, null, c])).toEqual([[a, b], [c]]);
    expect(runsOf([null, null])).toEqual([]);
  });

  it("writes M then L, and closes an area down to the baseline", () => {
    const run = [
      { x: 0, y: 10 },
      { x: 20, y: 5 },
    ];
    expect(linePath(run)).toBe("M0.0 10.0 L20.0 5.0");
    expect(areaPath(run, 40)).toBe(
      "M0.0 10.0 L20.0 5.0 L20.0 40.0 L0.0 40.0 Z",
    );
    expect(areaPath([], 40)).toBe("");
  });
});

describe("labelIndices", () => {
  it("shows every label when there are few, and spreads them evenly when many", () => {
    expect(labelIndices(3, 5)).toEqual([0, 1, 2]);
    expect(labelIndices(16, 5)).toEqual([0, 4, 8, 11, 15]);
    expect(labelIndices(0, 5)).toEqual([]);
  });
});

describe("chartGeometry on the recorded 16 days", () => {
  const g = chartGeometry(rows, [rain, et0], mm, BOX);

  it("puts each y tick inside the plot and the zero line at the floor", () => {
    expect(g.yTicks.length).toBeGreaterThan(2);
    for (const t of g.yTicks) {
      expect(t.y).toBeGreaterThanOrEqual(-0.001);
      expect(t.y).toBeLessThanOrEqual(BOX.height - BOX.footer + 0.001);
    }
    expect(g.baseline).toBeCloseTo(BOX.height - BOX.footer, 3);
    expect(g.yTicks[0].label).toBe("0 mm");
  });

  it("draws one bar per day that has rain data, none for a null, all inside the box", () => {
    const rainSeries = g.series[0];
    const withRain = rows.filter((r) => typeof r.rainMm === "number").length;
    expect(rainSeries.bars).toHaveLength(withRain);
    expect(withRain).toBeLessThan(rows.length + 1);
    for (const b of rainSeries.bars) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(BOX.width + 0.001);
      expect(b.height).toBeGreaterThanOrEqual(1);
    }
  });

  it("splits the ET₀ line where the forecast has no value", () => {
    const et = g.series[1];
    const gaps = rows.some((r) => r.et0Mm === null);
    expect(gaps ? et.runs.length : 1).toBeGreaterThanOrEqual(1);
    expect(et.bars).toEqual([]);
  });

  it("labels at most the asked number of days, first and last included", () => {
    expect(g.xTicks.length).toBeLessThanOrEqual(BOX.maxXLabels);
    expect(g.xTicks[0].label).toBe(rows[0].date);
    expect(g.xTicks[g.xTicks.length - 1].label).toBe(
      rows[rows.length - 1].date,
    );
  });

  it("draws an area as a closed path", () => {
    const area: SeriesSpec = {
      key: "cumulativeBalanceMm",
      label: "Running balance",
      kind: "area",
      tone: "malachite",
    };
    const ga = chartGeometry(rows, [area], { format: (v) => `${v}` }, BOX);
    expect(ga.series[0].areas.length).toBeGreaterThan(0);
    expect(ga.series[0].areas[0]).toMatch(/Z$/);
  });

  it("is empty, not broken, with no rows", () => {
    const empty = chartGeometry([], [rain], mm, BOX);
    expect(empty.series[0].bars).toEqual([]);
    expect(empty.xTicks).toEqual([]);
  });
});

describe("describeChart (what VoiceOver reads)", () => {
  it("names the span and each series' low and high with the day", () => {
    const text = describeChart(
      "Rain against crop water use",
      rows,
      [rain, et0],
      mm,
    );
    expect(text).toContain("Rain against crop water use. 16 days,");
    expect(text).toContain(`${rows[0].date} to ${rows[rows.length - 1].date}`);
    expect(text).toMatch(/Rain: lowest .* mm on .*, highest .* mm on .*\./);
    expect(text).toContain("ET₀: lowest");
  });

  it("says so, instead of reading zero, for a series with no value", () => {
    const text = describeChart(
      "Soil",
      [{ date: "1 Nov", sm: null }],
      [{ key: "sm", label: "Topsoil", tone: "x" }],
      { format: String },
    );
    expect(text).toContain("Topsoil: no data.");
  });

  it("says there is no data for no rows", () => {
    expect(describeChart("Soil", [], [], { format: String })).toBe(
      "Soil. No data.",
    );
  });
});
