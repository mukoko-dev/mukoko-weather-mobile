/**
 * Pure-function tests for the ported Open-Meteo helpers.
 * No network here: the app reads weather only through src/api/weather.ts.
 */

import {
  checkFrostRisk,
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
