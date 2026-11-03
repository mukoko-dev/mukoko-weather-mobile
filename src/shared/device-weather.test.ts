/**
 * The rules for a forecast kept on the phone (issue #69), ported from the web:
 * how old is too old, how it is re-based on "now" at the place, and its label.
 */

import {
  CURRENT_MAX_AGE_MS,
  forecastEndsAt,
  freshnessOf,
  rebaseBody,
  slimBody,
  updatedAgoLabel,
} from "@/shared/device-weather";

/** Harare (UTC+2), hourly from 00:00 local on 1 Nov for 36 hours. */
function body() {
  const time = Array.from({ length: 36 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 10, 1, i));
    return d.toISOString().slice(0, 16);
  });
  return {
    current: { time: "2026-11-01T10:30", temperature_2m: 25, weather_code: 0 },
    hourly: {
      time,
      temperature_2m: time.map((_, i) => 10 + i),
      weather_code: time.map((_, i) => (i === 14 ? 61 : 0)),
    },
    daily: {
      time: ["2026-11-01", "2026-11-02"],
      temperature_2m_max: [30, 31],
    },
    utc_offset_seconds: 7200,
    minutely: { time: ["2026-11-01T10:30"], precipitation: [0] },
    models: [{ model: "a" }],
    models_time: ["2026-11-01T10:00"],
  };
}

/** Harare local wall time as an instant. */
const at = (day: number, hour: number, minute = 0) =>
  Date.UTC(2026, 10, day, hour - 2, minute);

describe("slimBody", () => {
  it("drops what goes stale within minutes and keeps the forecast", () => {
    const slim = slimBody(body());
    expect(slim.minutely).toBeUndefined();
    expect(slim.models).toBeUndefined();
    expect(slim.models_time).toBeUndefined();
    expect(slim.hourly).toEqual(body().hourly);
  });
});

describe("freshnessOf", () => {
  it("is current for an hour, then the forecast, then nothing once the hours run out", () => {
    const fetched = at(1, 10, 30);
    expect(freshnessOf(fetched, body(), fetched + 5 * 60_000)).toBe("current");
    expect(freshnessOf(fetched, body(), fetched + CURRENT_MAX_AGE_MS + 1)).toBe(
      "forecast",
    );
    // The last hour is 11:00 on 2 Nov: from 12:00 there is nothing to show.
    expect(forecastEndsAt(body())).toBe(at(2, 12));
    expect(freshnessOf(fetched, body(), at(2, 11, 59))).toBe("forecast");
    expect(freshnessOf(fetched, body(), at(2, 12))).toBeNull();
  });

  it("never calls a stored copy from the future current", () => {
    const now = at(1, 10);
    expect(freshnessOf(now + 60 * 60_000, body(), now)).toBe("forecast");
    expect(freshnessOf(Number.NaN, body(), now)).toBe("forecast");
  });

  it("shows nothing for a body with no hours", () => {
    expect(freshnessOf(at(1, 10), { current: {} }, at(1, 10))).toBeNull();
  });
});

describe("rebaseBody", () => {
  it("starts the hours at the place's current hour and the days today", () => {
    const now = at(2, 3, 20);
    const out = rebaseBody(body(), "current", now);
    expect((out.hourly as { time: string[] }).time[0]).toBe("2026-11-02T03:00");
    expect((out.daily as { time: string[] }).time[0]).toBe("2026-11-02");
    // A reading under an hour old is kept as it is.
    expect(out.current).toEqual(body().current);
    expect(out.minutely).toBeUndefined();
  });

  it("makes the forecast for this hour the current conditions once over an hour old", () => {
    const now = at(1, 14, 10);
    const out = rebaseBody(body(), "forecast", now);
    expect(out.current).toMatchObject({
      time: "2026-11-01T14:00",
      temperature_2m: 24,
      weather_code: 61,
    });
  });
});

describe("updatedAgoLabel", () => {
  it.each([
    [10_000, "Updated just now"],
    [12 * 60_000, "Updated 12 min ago"],
    [3 * 3_600_000, "Updated 3 h ago"],
    [50 * 3_600_000, "Updated 2 days ago"],
  ])("labels %d ms as %s", (ago, label) => {
    expect(updatedAgoLabel(1_000_000_000 - ago, 1_000_000_000)).toBe(label);
  });
});
