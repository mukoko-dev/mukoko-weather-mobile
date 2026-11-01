/**
 * The geometry behind the small charts: nice axes, label spacing, paths that
 * break at a gap, bars from the floor, and the spoken summary.
 */

import {
  BAR_FILL,
  MIN_BAR_PX,
  areaPaths,
  barRects,
  describeSeries,
  extent,
  fraction,
  linePaths,
  niceStep,
  resolveAxis,
  xAt,
  xTickIndices,
  yAt,
} from "./chart-geometry";

const plot = { width: 240, height: 100, centered: false };

describe("extent", () => {
  it("skips gaps and non-numbers", () => {
    expect(extent([3, null, undefined, NaN, 9, -2])).toEqual([-2, 9]);
    expect(extent([null, undefined])).toBeNull();
    expect(extent([])).toBeNull();
  });
});

describe("niceStep", () => {
  it.each([
    [10, 4, 2.5],
    [100, 4, 25],
    [8, 4, 2],
    [1, 4, 0.25],
    [30, 6, 5],
    [30, 5, 10],
  ])("range %f in about %i ticks steps by %f", (range, count, step) => {
    expect(niceStep(range, count)).toBe(step);
  });
});

describe("resolveAxis", () => {
  it("widens a free axis to a tick so the data never touches the frame", () => {
    const axis = resolveAxis([17.2, 21.8, 30.4]);
    expect(axis.min).toBeLessThanOrEqual(17.2);
    expect(axis.max).toBeGreaterThanOrEqual(30.4);
    expect(axis.ticks[0]).toBeGreaterThanOrEqual(axis.min);
    expect(axis.ticks[axis.ticks.length - 1]).toBeLessThanOrEqual(axis.max);
    // ascending, evenly spaced
    const gaps = axis.ticks.slice(1).map((t, i) => t - axis.ticks[i]);
    expect(new Set(gaps.map((g) => Math.round(g * 1e6))).size).toBe(1);
  });

  it("keeps a fixed bound exactly and ticks inside it", () => {
    const axis = resolveAxis([20, 55, 91], { min: 0, max: 100 });
    expect(axis.min).toBe(0);
    expect(axis.max).toBe(100);
    expect(axis.ticks[0]).toBe(0);
    expect(axis.ticks[axis.ticks.length - 1]).toBe(100);
  });

  it("gives a flat series a range, so it draws as a line", () => {
    const axis = resolveAxis([5, 5, 5]);
    expect(axis.max).toBeGreaterThan(axis.min);
    const floor = resolveAxis([0, 0, 0], { min: 0 });
    expect(floor.min).toBe(0);
    expect(floor.max).toBeGreaterThan(0);
  });

  it("copes with no data at all", () => {
    const axis = resolveAxis([null, undefined]);
    expect(axis.max).toBeGreaterThan(axis.min);
  });
});

describe("fraction, xAt, yAt", () => {
  const axis = { min: 0, max: 10, ticks: [0, 5, 10] };
  it("places a value on the axis and clamps outside it", () => {
    expect(fraction(5, axis)).toBe(0.5);
    expect(fraction(-3, axis)).toBe(0);
    expect(fraction(99, axis)).toBe(1);
    expect(yAt(10, axis, plot)).toBe(0);
    expect(yAt(0, axis, plot)).toBe(100);
  });

  it("spreads a line edge to edge and a bar chart through slot centres", () => {
    expect(xAt(0, 5, plot)).toBe(0);
    expect(xAt(4, 5, plot)).toBe(240);
    const c = { ...plot, centered: true };
    expect(xAt(0, 4, c)).toBe(30);
    expect(xAt(3, 4, c)).toBe(210);
    expect(xAt(0, 1, plot)).toBe(120);
  });
});

describe("xTickIndices", () => {
  it("prints every label when they fit", () => {
    expect(xTickIndices(4, 6)).toEqual([0, 1, 2, 3]);
  });
  it("spreads at most maxTicks, first and last included", () => {
    const idx = xTickIndices(24, 6);
    expect(idx).toHaveLength(6);
    expect(idx[0]).toBe(0);
    expect(idx[idx.length - 1]).toBe(23);
  });
  it("is empty for nothing and a single label for one slot", () => {
    expect(xTickIndices(0, 6)).toEqual([]);
    expect(xTickIndices(24, 1)).toEqual([0]);
  });
});

describe("linePaths and areaPaths", () => {
  const axis = { min: 0, max: 10, ticks: [0, 10] };

  it("draws one path for a full series", () => {
    const paths = linePaths([0, 10], axis, plot);
    expect(paths).toEqual([{ d: "M 0 100 L 240 0", dot: false }]);
  });

  it("breaks the line at a gap instead of drawing through it as zero", () => {
    const paths = linePaths([1, 2, null, 4, 5], axis, plot);
    expect(paths).toHaveLength(2);
    expect(paths[0].d.startsWith("M 0 ")).toBe(true);
    expect(paths[1].d.startsWith("M 180 ")).toBe(true);
  });

  it("marks a lone point as a dot", () => {
    const paths = linePaths([null, 3, null], axis, plot);
    expect(paths).toHaveLength(1);
    expect(paths[0].dot).toBe(true);
  });

  it("closes the area down to the zero line (or the floor)", () => {
    const [area] = areaPaths([0, 10], axis, plot);
    expect(area).toBe("M 0 100 L 0 100 L 240 0 L 240 100 Z");
    const [high] = areaPaths([1010, 1014], { min: 1000, max: 1020, ticks: [] }, plot);
    // The floor is 1000 (zero is below the axis), so the base is the bottom.
    expect(high.endsWith("100 Z")).toBe(true);
    expect(areaPaths([5], axis, plot)).toEqual([]);
  });
});

describe("barRects", () => {
  const axis = { min: 0, max: 10, ticks: [0, 10] };
  const centered = { width: 100, height: 50, centered: true };

  it("rises from the floor, 70% of the slot wide, and skips a gap", () => {
    const bars = barRects([10, null, 5], axis, centered);
    expect(bars.map((b) => b.index)).toEqual([0, 2]);
    const slot = 100 / 3;
    expect(bars[0].width).toBeCloseTo(slot * BAR_FILL, 1);
    expect(bars[0].height).toBe(50);
    expect(bars[0].y).toBe(0);
    expect(bars[1].height).toBe(25);
    expect(bars[1].y).toBe(25);
  });

  it("never lets a real value vanish", () => {
    const [b] = barRects([0.001], axis, centered);
    expect(b.height).toBe(MIN_BAR_PX);
  });
});

describe("describeSeries", () => {
  it("says where a series starts, ends, bottoms and peaks", () => {
    const text = describeSeries(
      "Wind speed, next 24 hours",
      [{ label: "Speed", unit: "km/h", values: [10, 14, 18, 12] }],
      ["Now", "15:00", "16:00", "17:00"],
    );
    expect(text).toBe(
      "Wind speed, next 24 hours. Speed: from 10 km/h at Now to 12 km/h at 17:00; lowest 10 km/h at Now, highest 18 km/h at 16:00.",
    );
  });

  it("says no data rather than zero, and handles one point", () => {
    expect(
      describeSeries("Rain", [{ label: "mm", unit: "", values: [null, null] }], []),
    ).toBe("Rain. mm: no data.");
    expect(
      describeSeries("UV", [{ label: "UV", unit: "", values: [null, 6.4] }], ["a", "b"]),
    ).toBe("UV. UV: 6.4 at b.");
  });
});
