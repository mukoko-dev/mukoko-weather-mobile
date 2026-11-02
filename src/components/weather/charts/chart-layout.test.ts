/** The chart geometry: axes, ticks, paths, bars and which point a touch lands on. */

import {
  X_LABEL_EM,
  anchorOf,
  areaPath,
  barsOf,
  chooseLabelIndices,
  estimateTextWidth,
  linePath,
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
    expect(niceTicks(1010, 1020)).toEqual([1010, 1012, 1014, 1016, 1018, 1020]);
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
    expect(
      resolveDomain([null, 4, null, 8], { min: 0, max: 10 }, false),
    ).toEqual({ min: 0, max: 10 });
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
    expect(bars.map((b) => b.index)).toEqual([1, 2]);
    const five = bars[0];
    expect(five.y).toBeCloseTo(50);
    expect(five.height).toBeCloseTo(50);
    expect(bars[1].y).toBeCloseTo(0);
  });

  it("draws nothing for a value on the zero line (a night's UV 0 is an empty slot)", () => {
    const bars = barsOf([0, 5, 0], domain, 0, 90, 0, 100);
    expect(bars.map((b) => b.index)).toEqual([1]);
  });

  it("is 72% of a band wide (Chart.js 0.9 x 0.8) and centred on it", () => {
    const [b] = barsOf([5, 5, 5], domain, 0, 90, 0, 100);
    expect(b.width).toBeCloseTo(30 * 0.72);
    expect(b.x + b.width / 2).toBeCloseTo(15);
  });

  it("skips a gap", () => {
    expect(
      barsOf([1, null, 3], domain, 0, 90, 0, 100).map((b) => b.index),
    ).toEqual([0, 2]);
  });
});

describe("x labels", () => {
  /** 24 hourly labels, 12 dp type: "Now", then "03:00" and so on, ~34 dp each. */
  const xs = Array.from({ length: 24 }, (_, i) => xAt(i, 24, 30, 290, false));
  const widths = Array.from({ length: 24 }, (_, i) =>
    estimateTextWidth(i === 0 ? "Now" : "03:00", 12, X_LABEL_EM),
  );

  it("anchors the first label at its start and the last at its end", () => {
    expect(anchorOf(0, 7)).toBe("start");
    expect(anchorOf(6, 7)).toBe("end");
    expect(anchorOf(3, 7)).toBe("middle");
    expect(anchorOf(0, 1)).toBe("start");
  });

  it("shows every label when they all fit", () => {
    const x7 = Array.from({ length: 7 }, (_, i) => xAt(i, 7, 30, 290, false));
    const w7 = [5, 3, 3, 3, 3, 3, 3].map((n) =>
      estimateTextWidth("x".repeat(n), 12, X_LABEL_EM),
    );
    expect(chooseLabelIndices(x7, w7, 8, 4)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("skips labels evenly when they would touch, never more than the limit", () => {
    const shown = chooseLabelIndices(xs, widths, 8, 6);
    expect(shown[0]).toBe(0);
    const step = shown[1] - shown[0];
    expect(step).toBeGreaterThan(1);
    shown.forEach((v, k) => expect(v).toBe(k * step));
    expect(shown.length).toBeLessThanOrEqual(8);
    expect(chooseLabelIndices(xs, widths, 3, 6).length).toBeLessThanOrEqual(3);
  });

  it("draws fewer when the text is bigger or the plot narrower", () => {
    const big = widths.map((w) => w * 1.5);
    expect(chooseLabelIndices(xs, big, 24, 6).length).toBeLessThanOrEqual(
      chooseLabelIndices(xs, widths, 24, 6).length,
    );
    const narrow = Array.from({ length: 24 }, (_, i) =>
      xAt(i, 24, 30, 120, false),
    );
    expect(chooseLabelIndices(narrow, widths, 24, 6).length).toBeLessThan(
      chooseLabelIndices(xs, widths, 24, 6).length,
    );
  });

  it("no two drawn labels touch", () => {
    for (const w of [1, 1.5, 2]) {
      const ws = widths.map((n) => n * w);
      const shown = chooseLabelIndices(xs, ws, 24, 6);
      for (let k = 1; k < shown.length; k++) {
        const a = shown[k - 1];
        const b = shown[k];
        const aEnd = xs[a] + (a === 0 ? ws[a] : ws[a] / 2);
        const bStart = xs[b] - (b === 23 ? ws[b] : ws[b] / 2);
        expect(bStart - aEnd).toBeGreaterThanOrEqual(6);
      }
    }
  });

  it("is empty for no points and the first label alone when nothing fits", () => {
    expect(chooseLabelIndices([], [], 8, 6)).toEqual([]);
    expect(chooseLabelIndices([0, 1], [50, 50], 8, 6)).toEqual([0]);
  });
});
