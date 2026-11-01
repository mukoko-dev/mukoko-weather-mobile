/**
 * The 7-day card: the web's range-bar maths (the web's own `tempPercent`
 * vectors), weekdays read as the PLACE's calendar days whatever zone the phone
 * is in, and one spoken label per day.
 */

import { render } from "@testing-library/react-native";

import {
  DailyCard,
  dayName,
  dayOfMonth,
  dayRows,
  tempPercent,
} from "@/components/weather/DailyCard";

import {
  HAS_EMOJI,
  allText,
  harareWeather,
} from "@/test-utils/weather-fixtures";

describe("tempPercent (vectors from the web's DailyForecast.test.ts)", () => {
  it("returns 0, 100 and 50 at the minimum, maximum and midpoint", () => {
    expect(tempPercent(10, 10, 30)).toBe(0);
    expect(tempPercent(30, 10, 30)).toBe(100);
    expect(tempPercent(20, 10, 30)).toBe(50);
  });

  it("returns 50 when the range is zero and handles negatives", () => {
    expect(tempPercent(20, 20, 20)).toBe(50);
    expect(tempPercent(-5, -10, 0)).toBe(50);
    expect(tempPercent(-10, -10, 0)).toBe(0);
    expect(tempPercent(0, -10, 0)).toBe(100);
  });

  it("calculates arbitrary positions", () => {
    expect(tempPercent(10, 0, 40)).toBe(25);
    expect(tempPercent(30, 0, 40)).toBe(75);
  });
});

describe("dayName", () => {
  it("says Today for the first day and the weekday of the place's date after that", () => {
    expect(dayName("2026-11-01", 0)).toBe("Today");
    expect(dayName("2026-11-02", 1)).toBe("Mon");
    expect(dayName("2026-11-07", 6)).toBe("Sat");
    expect(dayOfMonth("2026-11-07")).toBe(7);
  });

  it("does not shift a day when the phone is west of UTC", () => {
    const spy = jest
      .spyOn(Date.prototype, "getTimezoneOffset")
      .mockReturnValue(480);
    try {
      expect(dayName("2026-11-02", 1)).toBe("Mon");
    } finally {
      spy.mockRestore();
    }
  });

  it("leaves a dash for a garbage date, never NaN", () => {
    expect(dayName("garbage", 2)).toBe("—");
  });
});

describe("DailyCard", () => {
  const forecast = harareWeather().forecast!;

  it("has a row per day with a spoken label, and the range bar inside the week", () => {
    const rows = dayRows(forecast);
    expect(rows).toHaveLength(7);
    expect(rows[0].label).toMatch(
      /^Today 1: .*, high -?\d+ degrees, low -?\d+ degrees$/,
    );
    for (const r of rows) {
      expect(r.lowPct).toBeGreaterThanOrEqual(0);
      expect(r.highPct).toBeLessThanOrEqual(100);
      expect(r.highPct).toBeGreaterThanOrEqual(r.lowPct);
    }
  });

  it("renders the heading, a labelled item per day and no emoji", async () => {
    const tree = await render(<DailyCard forecast={forecast} />);
    expect(tree.getByText("7-Day Forecast")).toBeTruthy();
    expect(
      tree.getAllByLabelText(/^(Today|Mon|Tue|Wed|Thu|Fri|Sat) \d+: /),
    ).toHaveLength(7);
    expect(HAS_EMOJI.test(allText(tree.toJSON()))).toBe(false);
  });

  it("renders nothing for a forecast with no days", async () => {
    const f = { ...forecast, daily: { ...forecast.daily, time: [] } };
    const { toJSON } = await render(<DailyCard forecast={f} />);
    expect(toJSON()).toBeNull();
  });
});
