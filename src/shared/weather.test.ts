/**
 * Pure-function tests for the ported Open-Meteo helpers.
 * No network here: the app reads weather only through src/api/weather.ts.
 */

import {
  checkFrostRisk,
  checkFrostRiskAhead,
  createFallbackWeather,
  getDefaultSeason,
  uvLevel,
  weatherCodeToInfo,
  windDirection,
} from "@/shared/weather";

describe("weatherCodeToInfo", () => {
  it("maps WMO codes to label + icon", () => {
    expect(weatherCodeToInfo(0).label).toBe("Clear sky");
    expect(weatherCodeToInfo(95).label).toBe("Thunderstorm");
    expect(weatherCodeToInfo(999).label).toBe("Unknown");
  });
});

describe("getDefaultSeason", () => {
  it("returns southern-hemisphere seasons for negative latitudes", () => {
    expect(getDefaultSeason(new Date("2026-01-15"), -17).name).toBe("Summer");
    expect(getDefaultSeason(new Date("2026-07-15"), -17).name).toBe("Winter");
  });

  it("returns northern-hemisphere seasons for positive latitudes", () => {
    expect(getDefaultSeason(new Date("2026-01-15"), 40).name).toBe("Winter");
    expect(getDefaultSeason(new Date("2026-07-15"), 40).name).toBe("Summer");
  });
});

describe("windDirection", () => {
  it("returns compass directions", () => {
    expect(windDirection(0)).toBe("N");
    expect(windDirection(90)).toBe("E");
    expect(windDirection(180)).toBe("S");
    expect(windDirection(270)).toBe("W");
  });
});

describe("uvLevel", () => {
  it("classifies UV severity", () => {
    expect(uvLevel(1).label).toBe("Low");
    expect(uvLevel(4).label).toBe("Moderate");
    expect(uvLevel(7).label).toBe("High");
    expect(uvLevel(9).label).toBe("Very High");
    expect(uvLevel(12).label).toBe("Extreme");
  });
});

describe("checkFrostRisk", () => {
  it("returns null when no overnight hour drops to <=3°C", () => {
    const hourly = {
      time: ["2026-06-01T22:00:00Z", "2026-06-02T05:00:00Z"],
      temperature_2m: [10, 8],
      apparent_temperature: [10, 8],
      relative_humidity_2m: [50, 50],
      precipitation_probability: [0, 0],
      precipitation: [0, 0],
      weather_code: [0, 0],
      visibility: [10000, 10000],
      cloud_cover: [10, 10],
      surface_pressure: [1015, 1015],
      wind_speed_10m: [5, 5],
      wind_direction_10m: [0, 0],
      wind_gusts_10m: [8, 8],
      uv_index: [0, 0],
      is_day: [0, 0],
    };
    expect(checkFrostRisk(hourly)).toBeNull();
  });

  it("never reads a missing overnight reading as a frost hour", () => {
    // `toForecast` keeps a null inside a column; `null <= 3` is true in JS.
    const hourly = {
      time: [
        "2026-06-01T22:00:00Z",
        "2026-06-02T05:00:00Z",
        "2026-06-02T06:00",
      ],
      temperature_2m: [null, Number.NaN, 18],
      apparent_temperature: [10, 8, 18],
      relative_humidity_2m: [50, 50, 50],
      precipitation_probability: [0, 0, 0],
      precipitation: [0, 0, 0],
      weather_code: [0, 0, 0],
      visibility: [10000, 10000, 10000],
      cloud_cover: [10, 10, 10],
      surface_pressure: [1015, 1015, 1015],
      wind_speed_10m: [5, 5, 5],
      wind_direction_10m: [0, 0, 0],
      wind_gusts_10m: [8, 8, 8],
      uv_index: [0, 0, 0],
      is_day: [0, 0, 1],
    } as unknown as Parameters<typeof checkFrostRisk>[0];
    expect(checkFrostRisk(hourly)).toBeNull();
    // A real cold hour beside a missing one still alerts, on the real one.
    const mixed = {
      ...hourly,
      temperature_2m: [null, 1.5, 18],
    } as unknown as Parameters<typeof checkFrostRisk>[0];
    expect(checkFrostRisk(mixed)?.lowestTemp).toBe(1.5);
  });

  it("flags severe frost when overnight temps go below 0°C", () => {
    const hourly = {
      time: ["2026-06-01T22:00:00Z", "2026-06-02T05:00:00Z"],
      temperature_2m: [2, -1],
      apparent_temperature: [2, -1],
      relative_humidity_2m: [50, 50],
      precipitation_probability: [0, 0],
      precipitation: [0, 0],
      weather_code: [0, 0],
      visibility: [10000, 10000],
      cloud_cover: [10, 10],
      surface_pressure: [1015, 1015],
      wind_speed_10m: [5, 5],
      wind_direction_10m: [0, 0],
      wind_gusts_10m: [8, 8],
      uv_index: [0, 0],
      is_day: [0, 0],
    };
    const alert = checkFrostRisk(hourly);
    expect(alert).not.toBeNull();
    expect(alert?.risk).toBe("severe");
    expect(alert?.lowestTemp).toBe(-1);
  });
});

describe("createFallbackWeather", () => {
  it("returns a 7-day, 48-hour fully-populated WeatherData payload", () => {
    const data = createFallbackWeather(-17.83, 31.05, 1490);
    expect(data.current.temperature_2m).toBeDefined();
    expect(data.hourly.time.length).toBe(48);
    expect(data.daily.time.length).toBe(7);
  });

  it("reads the night in the place's time zone, not the phone's", () => {
    const base = {
      temperature_2m: [2],
      apparent_temperature: [2],
      relative_humidity_2m: [50],
      precipitation_probability: [0],
      precipitation: [0],
      weather_code: [0],
      visibility: [10000],
      cloud_cover: [10],
      surface_pressure: [1015],
      wind_speed_10m: [5],
      wind_direction_10m: [0],
      wind_gusts_10m: [8],
      uv_index: [0],
      is_day: [0],
    };
    // 20:00 UTC is 22:00 in Harare (+2): night there.
    const zoned = { ...base, time: ["2026-06-01T20:00:00Z"] };
    expect(checkFrostRisk(zoned, 7200)).not.toBeNull();
    // The same instant is 12:00 in Los Angeles (-8): midday, no frost window.
    expect(checkFrostRisk(zoned, -28800)).toBeNull();
    // A naive wall-clock string is already the place's hour.
    expect(
      checkFrostRisk({ ...base, time: ["2026-06-01T23:00"] }),
    ).not.toBeNull();
    expect(checkFrostRisk({ ...base, time: ["2026-06-01T13:00"] })).toBeNull();
  });
});

describe("checkFrostRiskAhead (the banner's coming night)", () => {
  const pad = (n: number) => String(n).padStart(2, "0");
  /** Five days of naive Harare hours from local midnight, 2026-10-08, all 15°C. */
  const series = (cold: number[]) => {
    const time = Array.from(
      { length: 120 },
      (_, i) => `2026-10-${pad(8 + Math.floor(i / 24))}T${pad(i % 24)}:00`,
    );
    const temperature_2m = time.map((_, i) => (cold.includes(i) ? 2 : 15));
    return { time, temperature_2m } as unknown as Parameters<
      typeof checkFrostRiskAhead
    >[0];
  };
  const HARARE = 7200;
  // 13:00 UTC is 15:00 in Harare on 2026-10-08.
  const AFTERNOON = new Date(Date.UTC(2026, 9, 8, 13, 0));

  it("ignores this morning's cold hour, already past", () => {
    expect(checkFrostRiskAhead(series([5]), HARARE, AFTERNOON)).toBeNull();
  });

  it("warns of the coming night", () => {
    const alert = checkFrostRiskAhead(series([24 + 3]), HARARE, AFTERNOON);
    expect(alert?.lowestTemp).toBe(2);
    expect(alert?.startTime).toBe("2026-10-09T03:00");
  });

  it("does not call a night four days away 'tonight'", () => {
    expect(
      checkFrostRiskAhead(series([4 * 24 + 3]), HARARE, AFTERNOON),
    ).toBeNull();
  });

  it("says nothing from a stale series", () => {
    const later = new Date(Date.UTC(2026, 9, 20, 13, 0));
    expect(checkFrostRiskAhead(series([24 + 3]), HARARE, later)).toBeNull();
  });
});
