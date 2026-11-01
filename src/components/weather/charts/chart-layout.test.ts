/** The chart geometry: axes, ticks, paths, bars and which point a touch lands on. */

import {
  areaPath,
  barsOf,
  estimateTextWidth,
  labelIndices,
  linePath,
  maxLabelsFitting,
  nearestIndex,
  niceStep,
  niceTicks,
  paddedRange,
  resolveDomain,
  runsOf,
  xAt,
  yOf,
} from "./chart-layout";

/** The numbers in a path, in order. */
function nums(d: string): number[] {
  return (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
}

describe("niceStep and niceTicks", () => {
  it("picks 1, 2, 5 times a power of ten", () => {
    expect(niceStep(10, 4)).toBe(5);
    expect(niceStep(100, 4)).toBe(50);
    expect(niceStep(7, 4)).toBe(2);
    expect(niceStep(0.8, 4)).toBe(0.2);
    expect(niceStep(0, 4)).toBe(1);
  });

  it("gives round ticks inside the range", () => {
    expect(niceTicks(0, 100)).toEqual([0, 20, 40, 60, 80, 100]);
    expect(niceTicks(11, 33)).toEqual([15, 20, 25, 30]);
    expect(niceTicks(1010, 1020)).toEqual([
      1010, 1012, 1014, 1016, 1018, 1020,
    ]);
    expect(niceTicks(12, 24)).toEqual([12, 14, 16, 18, 20, 22, 24]);
  });

  it("never draws more ticks than the cap", () => {
    for (const [lo, hi] of [
      [0, 1],
      [-17, 43],
      [0, 3600],
      [988, 1031],
    ]) {
      expect(niceTicks(lo, hi).length).toBeLessThanOrEqual(7);
      expect(niceTicks(lo, hi, 4).length).toBeLessThanOrEqual(4);
    }
  });

  it("has no binary noise on a fractional axis", () => {
    expect(niceTicks(0, 0.6)).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6]);
  });

  it("is a single tick for an empty range", () => {
    expect(niceTicks(5, 5)).toEqual([5]);
  });
});

describe("resolveDomain", () => {
  it("honours a configured min and max exactly", () => {
    expect(resolveDomain([3, 9], { min: 0, max: 100 }, false)).toEqual({
      min: 0,
      max: 100,
    });
  });

  it("rounds an automatic range out to round numbers", () => {
    expect(resolveDomain([12.3, 27.8], undefined, false)).toEqual({
      min: 10,
      max: 30,
    });
  });

  it("starts bars at zero unless a min is given", () => {
    expect(resolveDomain([4, 9], undefined, true)?.min).toBe(0);
    expect(resolveDomain([4, 9], { min: 2 }, true)?.min).toBe(2);
  });

  it("gives a flat series some height", () => {
    const d = resolveDomain([5, 5, 5], undefined, false);
    expect(d && d.max > d.min).toBe(true);
  });

  it("skips gaps, and is null when there is nothing to plot", () => {
    expect(resolveDomain([null, 4, null, 8], { min: 0, max: 10 }, false)).toEqual(
      { min: 0, max: 10 },
    );
    expect(resolveDomain([null, null], undefined, false)).toBeNull();
    expect(resolveDomain([], { min: 0 }, false)).toBeNull();
  });

  it("uses the configured range even with no data", () => {
    expect(resolveDomain([null], { min: 0, max: 100 }, false)).toEqual({
      min: 0,
      max: 100,
    });
  });
});

describe("paddedRange", () => {
  it("widens the data's range by the pad, as the web does with -2 and +2", () => {
    expect(paddedRange([14, 22, null, 18], 2, { min: 0, max: 1 })).toEqual({
      min: 12,
      max: 24,
    });
  });
  it("falls back when there are no readings", () => {
    expect(paddedRange([null], 2, { min: 1010, max: 1020 })).toEqual({
      min: 1010,
      max: 1020,
    });
  });
});

describe("positions", () => {
  it("puts the first and last point on the plot edges for a line", () => {
    expect(xAt(0, 5, 10, 100, false)).toBe(10);
    expect(xAt(4, 5, 10, 100, false)).toBe(110);
    expect(xAt(2, 5, 10, 100, false)).toBe(60);
  });

  it("puts each bar's point in the middle of its band", () => {
    expect(xAt(0, 4, 0, 100, true)).toBe(12.5);
    expect(xAt(3, 4, 0, 100, true)).toBe(87.5);
  });

  it("centres a single point", () => {
    expect(xAt(0, 1, 0, 100, false)).toBe(50);
  });

  it("maps the top of the domain to the top of the plot", () => {
    const d = { min: 0, max: 10 };
    expect(yOf(10, d, 5, 100)).toBe(5);
    expect(yOf(0, d, 5, 100)).toBe(105);
    expect(yOf(5, d, 5, 100)).toBe(55);
  });

  it("finds the nearest point to a touch", () => {
    const xs = [0, 10, 20, 30];
    expect(nearestIndex(-50, xs)).toBe(0);
    expect(nearestIndex(14, xs)).toBe(1);
    expect(nearestIndex(16, xs)).toBe(2);
    expect(nearestIndex(500, xs)).toBe(3);
    expect(nearestIndex(5, [])).toBe(-1);
  });
});

describe("runsOf", () => {
  it("breaks a run at every gap", () => {
    expect(runsOf([1, 2, null, 4, Number.NaN, 6, 7])).toEqual([
      [0, 1],
      [3],
      [5, 6],
    ]);
    expect(runsOf([null, null])).toEqual([]);
    expect(runsOf([1, 2, 3])).toEqual([[0, 1, 2]]);
  });
});

describe("linePath", () => {
  it("is empty for no points and a move for one", () => {
    expect(linePath([])).toBe("");
    expect(linePath([{ x: 3, y: 4 }])).toBe("M3 4");
  });

  it("starts at the first point, ends at the last, and uses cubic segments", () => {
    const d = linePath([
      { x: 0, y: 10 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
    ]);
    expect(d.startsWith("M0 10 C")).toBe(true);
    expect(d.match(/C/g)).toHaveLength(2);
    const n = nums(d);
    expect(n.slice(-2)).toEqual([20, 10]);
  });

  it("never swings past a data point (monotone)", () => {
    // A steep rise then a flat top: a plain spline would overshoot above y=0.
    const pts = [
      { x: 0, y: 100 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 30, y: 0 },
    ];
    const n = nums(linePath(pts));
    // Every y coordinate in the path stays between the points' own min and max.
    const ys = n.filter((_, i) => i % 2 === 1);
    for (const y of ys) {
      expect(y).toBeGreaterThanOrEqual(-0.01);
      expect(y).toBeLessThanOrEqual(100.01);
    }
  });

  it("is a straight line through collinear points", () => {
    const d = linePath([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 20 },
    ]);
    const n = nums(d);
    // Control points of the first segment lie on y = x.
    expect(n[2]).toBeCloseTo(n[3], 1);
  });
});

describe("areaPath", () => {
  it("closes the curve down to the baseline", () => {
    const d = areaPath(
      [
        { x: 0, y: 10 },
        { x: 10, y: 5 },
      ],
      50,
    );
    expect(d.endsWith("L10 50 L0 50 Z")).toBe(true);
  });
  it("needs two points", () => {
    expect(areaPath([{ x: 0, y: 0 }], 50)).toBe("");
  });
});

describe("barsOf", () => {
  const domain = { min: 0, max: 10 };

  it("draws bars from the zero line up to the value, inside the plot", () => {
    const bars = barsOf([0, 5, 10], domain, 0, 90, 0, 100);
    expect(bars.map((b) => b.index)).toEqual([0, 1, 2]);
    const five = bars[1];
    expect(five.y).toBeCloseTo(50);
    expect(five.height).toBeCloseTo(50);
    expect(bars[2].y).toBeCloseTo(0);
    // A zero is still a hairline, not nothing.
    expect(bars[0].height).toBe(1);
  });

  it("is 72% of a band wide (Chart.js 0.9 x 0.8) and centred on it", () => {
    const [b] = barsOf([5, 5, 5], domain, 0, 90, 0, 100);
    expect(b.width).toBeCloseTo(30 * 0.72);
    expect(b.x + b.width / 2).toBeCloseTo(15);
  });

  it("skips a gap", () => {
    expect(barsOf([1, null, 3], domain, 0, 90, 0, 100).map((b) => b.index)).toEqual(
      [0, 2],
    );
  });
});

describe("x labels", () => {
  it("shows every label when they fit, and an even spread when they do not", () => {
    expect(labelIndices(5, 8)).toEqual([0, 1, 2, 3, 4]);
    expect(labelIndices(24, 8)).toEqual([0, 3, 6, 9, 12, 15, 18, 21]);
    expect(labelIndices(0, 8)).toEqual([]);
    expect(labelIndices(10, 1)).toEqual([0]);
  });

  it("limits the count to what fits the plot", () => {
    const w = estimateTextWidth("00:00", 12);
    expect(maxLabelsFitting(300, w, 8)).toBeLessThanOrEqual(8);
    expect(maxLabelsFitting(100, w, 8)).toBeLessThan(maxLabelsFitting(300, w, 8));
    expect(maxLabelsFitting(10, w, 8)).toBe(2);
    expect(maxLabelsFitting(300, 0, 8)).toBe(8);
  });
});
