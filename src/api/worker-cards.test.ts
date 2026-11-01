/**
 * The cards' routes of the weather Worker, each against a recorded answer
 * (Harare, 2026-11-01): the URL built (the point rounded to about 110 m, the
 * one door), the conversion at the edge, and what a gap or a refusal becomes.
 */

import { API_BASE_URL } from "@/api/client";
import { toMinutely, toModels, toWeatherResponse } from "@/api/weather";
import { fetchAirQuality, toAirQuality } from "@/api/air-quality";
import { fetchHaze, toHaze } from "@/api/haze";
import {
  fetchMonthlyNormals,
  fetchNormalHigh,
  fetchRecentDays,
  parseNormalHigh,
} from "@/api/climate";

import { mockFetch } from "./mock-fetch";
import airQualityHarare from "./__fixtures__/air-quality-harare.json";
import hazeHarare from "./__fixtures__/haze-harare.json";
import historyHarare from "./__fixtures__/history-harare.json";
import normalsTodayHarare from "./__fixtures__/normals-today-harare.json";
import normalsMonthlyHarare from "./__fixtures__/normals-monthly-harare.json";
import weatherHarare from "./__fixtures__/weather-harare.json";

const BASE = API_BASE_URL;

describe("the nowcast and the models in /v1/weather", () => {
  const weather = toWeatherResponse(weatherHarare as never);

  it("keeps the next-hour steps", () => {
    expect(weather.minutely?.precipitation).toEqual([0, 0, 0, 0]);
    expect(weather.minutely?.time[0]).toBe("2026-11-01T03:00");
  });

  it("keeps every model's hourly series on the shared axis", () => {
    expect(weather.models?.map((m) => m.model)).toEqual([
      "ecmwf_ifs",
      "ecmwf_aifs025_single",
      "gfs_seamless",
      "icon_global",
      "ukmo_global_deterministic_10km",
      "jma_gsm",
    ]);
    expect(weather.modelsTime).toHaveLength(24);
    expect(weather.models?.[0].temperature_2m).toHaveLength(24);
  });

  it("has neither when the Worker sent none", () => {
    const bare = toWeatherResponse({ current: {}, hourly: {}, daily: {} });
    expect(bare.minutely).toBeUndefined();
    expect(bare.models).toBeUndefined();
    expect(bare.modelsTime).toBeUndefined();
  });

  it("drops a nowcast with no number and a model with no id or no temperatures", () => {
    expect(toMinutely({ precipitation: [null, "x"], time: [] })).toBeUndefined();
    expect(toMinutely(null)).toBeUndefined();
    expect(
      toModels([
        { model: "", temperature_2m: [1] },
        { model: "gfs_seamless", temperature_2m: [] },
        { temperature_2m: [1] },
        null,
        { model: "icon_global", temperature_2m: [1, null, 3] },
      ]),
    ).toEqual([
      { model: "icon_global", temperature_2m: [1, null, 3], precipitation: [] },
    ]);
    expect(toModels("nope")).toBeUndefined();
  });
});

describe("air quality", () => {
  it("asks the Worker for the rounded point and converts the recorded answer", async () => {
    const calls = mockFetch({ body: airQualityHarare });
    const aq = await fetchAirQuality(-17.82912, 31.05234);
    expect(calls[0].url).toBe(
      `${BASE}/v1/air-quality?lat=-17.829&lon=31.052`,
    );
    expect(aq.aqi).toBe(68);
    expect(aq.level).toBe("moderate");
    expect(aq.dominantPollutant).toBe("pm2_5");
    expect(aq.pollutants.pm2_5).toBe(20.4);
    // A gap is kept as null, never zero.
    expect(aq.pollutants.nh3).toBeNull();
    expect(aq.subIndexes?.pm2_5).toBe(68);
    expect(aq.whoGuidelines?.pm2_5).toBe(15);
    expect(aq.source).toBe("open-meteo");
    expect(aq.trend).toBeNull();
  });

  it("reads the trend when the Worker sends one", () => {
    expect(toAirQuality({ aqi: 40, trend: "better" })?.trend).toBe("better");
    expect(toAirQuality({ aqi: 40, trend: "sideways" })?.trend).toBeNull();
  });

  it("has no reading without an index, and fails the card to its unavailable state", async () => {
    expect(toAirQuality({})).toBeNull();
    expect(toAirQuality({ aqi: "68" })).toBeNull();
    expect(toAirQuality({ aqi: -3 })).toBeNull();
    expect(toAirQuality(null)).toBeNull();
    mockFetch({ body: { error: "x" } });
    await expect(fetchAirQuality(0, 0)).rejects.toThrow(/unavailable/);
  });

  it("ignores an unknown dominant pollutant", () => {
    expect(
      toAirQuality({ aqi: 10, dominantPollutant: "radon" })?.dominantPollutant,
    ).toBeNull();
  });
});

describe("haze", () => {
  it("converts the recorded answer", async () => {
    const calls = mockFetch({ body: hazeHarare });
    const haze = await fetchHaze(-17.8252, 31.0335);
    expect(calls[0].url).toBe(`${BASE}/v1/haze?lat=-17.825&lon=31.034`);
    expect(haze.available).toBe(true);
    expect(haze.level).toBe("light");
    expect(haze.type).toBe("smog");
    expect(haze.headline).toBe("Light smog");
    expect(haze.visibilityKm).toBe(32.2);
    expect(haze.pm25).toBe(20.4);
    expect(haze.season?.active).toBe(false);
    expect(haze.season?.typicalType).toBe("smoke");
    expect(haze.official).toBeNull();
    expect(haze.advice).toHaveLength(2);
  });

  it("is unavailable when the Worker says so, or sends an unknown level", () => {
    expect(toHaze({ available: false, reason: "circuit_open" })).toMatchObject({
      available: false,
      reason: "circuit_open",
      level: null,
      type: null,
    });
    expect(toHaze({ available: true, level: "apocalyptic", type: "smog" }).available).toBe(false);
    expect(toHaze(null).available).toBe(false);
  });

  it("reads the official reading only when it is whole", () => {
    expect(
      toHaze({
        available: true,
        level: "heavy",
        type: "smoke",
        official: {
          source: "NEA Singapore",
          metric: "PSI",
          value: 142,
          band: "Unhealthy",
          region: "West",
        },
      }).official?.value,
    ).toBe(142);
    expect(
      toHaze({
        available: true,
        level: "heavy",
        type: "smoke",
        official: { source: "NEA" },
      }).official,
    ).toBeNull();
  });
});

describe("climate context", () => {
  it("reads today's normal high for the place's date", async () => {
    const calls = mockFetch({ body: normalsTodayHarare });
    expect(await fetchNormalHigh(-17.8252, 31.0335, "2026-11-01")).toBe(28.6);
    expect(calls[0].url).toBe(
      `${BASE}/v1/normals?lat=-17.825&lon=31.034&date=2026-11-01`,
    );
  });

  it("has no normal when the Worker says it is unavailable", () => {
    expect(parseNormalHigh({ available: false, reason: "no_data" })).toBeNull();
    expect(parseNormalHigh({ available: true, normalHigh: null })).toBeNull();
    expect(parseNormalHigh(undefined)).toBeNull();
  });

  it("reads twelve monthly normals, January first", async () => {
    const calls = mockFetch({ body: normalsMonthlyHarare });
    const normals = await fetchMonthlyNormals(-17.8252, 31.0335);
    expect(calls[0].url).toBe(`${BASE}/v1/normals/monthly?lat=-17.825&lon=31.034`);
    expect(normals.months).toHaveLength(12);
    expect(normals.months[0]).toMatchObject({
      month: 1,
      meanHighC: 24.8,
      precipMm: 212.9,
    });
    expect(normals.period).toBe("1991–2020");
  });

  it("fails when the answer is not twelve usable months", async () => {
    mockFetch({ body: { available: false, reason: "upstream_error" } });
    await expect(fetchMonthlyNormals(0, 0)).rejects.toThrow(/unavailable/);
  });

  it("reads the recorded days of a place by its slug, oldest first", async () => {
    const calls = mockFetch({ body: historyHarare });
    const days = await fetchRecentDays("harare");
    expect(calls[0].url).toBe(`${BASE}/v1/history?location=harare&days=30`);
    expect(days).toHaveLength(9);
    expect(days[0].date < days[8].date).toBe(true);
    expect(days.every((d) => d.highC !== null)).toBe(true);
  });
});
