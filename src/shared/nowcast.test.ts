/**
 * `nowcastSummary` cases are ported from mukoko-weather
 * `src/components/weather/MinutelyNowcast.test.ts`; the rows and spoken form
 * are the mobile card's own.
 */

import {
  type MinutelyData,
  nowcastRows,
  nowcastSpoken,
  nowcastSummary,
  nowcastTotal,
} from "./nowcast";

function minutely(precip: number[]): MinutelyData {
  return { time: precip.map((_, i) => `+${i * 15}`), precipitation: precip };
}

describe("nowcastSummary", () => {
  it("reports no rain when all steps are dry", () => {
    expect(nowcastSummary(minutely([0, 0, 0, 0]))).toBe(
      "No rain expected in the next hour.",
    );
  });

  it("reports rain starting soon when a later step is wet", () => {
    expect(nowcastSummary(minutely([0, 0, 0.5, 0.2]))).toBe(
      "Rain starting in ~30 min.",
    );
  });

  it("reports rain now when the first step is wet but easing", () => {
    expect(nowcastSummary(minutely([0.4, 0.1, 0, 0]))).toBe(
      "Rain is falling now — easing within the hour.",
    );
  });

  it("reports continuous rain when every step is wet", () => {
    expect(nowcastSummary(minutely([0.4, 0.5, 0.3, 0.2]))).toBe(
      "Rain is falling and continues through the next hour.",
    );
  });

  it("handles empty precipitation gracefully", () => {
    expect(nowcastSummary(minutely([]))).toBe("No nowcast data available.");
  });

  it("treats precip below threshold as dry", () => {
    // 0.05mm < 0.1mm threshold → still 'no rain'
    expect(nowcastSummary(minutely([0.05, 0.05, 0.05, 0.05]))).toBe(
      "No rain expected in the next hour.",
    );
  });
});

describe("nowcastRows", () => {
  it("labels the four steps Now, +15, +30, +45 and keeps at most four", () => {
    const rows = nowcastRows(minutely([0, 0.2, 0.4, 0.1, 9, 9]));
    expect(rows.map((r) => r.label)).toEqual(["Now", "+15", "+30", "+45"]);
    expect(rows.map((r) => r.precip)).toEqual([0, 0.2, 0.4, 0.1]);
  });

  it("never turns a missing value into rain", () => {
    const rows = nowcastRows({
      time: [],
      precipitation: [null as unknown as number, NaN, 0.3],
    });
    expect(rows.map((r) => r.precip)).toEqual([0, 0, 0.3]);
  });

  it("totals the rain and says it in words", () => {
    const rows = nowcastRows(minutely([0, 0.2, 0.4, 0.1]));
    expect(nowcastTotal(rows)).toBeCloseTo(0.7);
    expect(nowcastSpoken(rows)).toBe(
      "Now, 0.0 millimetres; in 15 minutes, 0.2 millimetres; in 30 minutes, 0.4 millimetres; in 45 minutes, 0.1 millimetres",
    );
    expect(nowcastSpoken(nowcastRows(minutely([0, 0, 0, 0])))).toBe(
      "No precipitation expected in the next hour.",
    );
    expect(nowcastSpoken([])).toBe("No nowcast data.");
  });
});
