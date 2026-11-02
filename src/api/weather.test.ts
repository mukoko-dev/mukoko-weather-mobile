/**
 * Weather: the Worker's answer converted to the screens' model, and the two
 * ways to ask (a coordinate, a place slug). The fixture is a real
 * `GET /v1/weather?lat=-17.83&lon=31.05` answer recorded on 2026-11-01 from
 * weather-api.mukoko.com, with the model-comparison and nowcast blocks removed
 * and the hourly columns cut to 36 hours. Nothing here touches the network.
 */

import { ApiError } from "@/api/client";
import {
  alignHourly,
  fetchWeather,
  toCurrent,
  toDaily,
  toForecast,
  toWeatherResponse,
} from "@/api/weather";
import { mockFetch } from "@/api/mock-fetch";

import locationHarare from "./__fixtures__/location-harare.json";
import errorNotFound from "./__fixtures__/error-not-found.json";
import weatherHarare from "./__fixtures__/weather-harare.json";

const BASE = "https://weather-api.mukoko.com";
const PROVIDER_HEADERS = {
  "X-Weather-Provider": "open-meteo:blend",
  "X-Fetched-At": "2026-11-01T00:45:10Z",
};

describe("toCurrent", () => {
  it("maps the Worker's snake_case reading to the screens' model", () => {
    expect(toCurrent(weatherHarare.current)).toEqual({
      temperature: 15.6,
      feelsLike: 14,
      humidity: 66,
      windSpeed: 10,
      windDirection: 49,
      pressure: 856.9,
      cloudCover: 0,
      uvIndex: 0,
      weatherCode: 0,
      description: "Clear sky",
      isDay: false,
      observedAt: "2026-11-01T02:45",
    });
  });

  it("reads is_day 1 as day, and leaves it unknown when absent", () => {
    expect(toCurrent({ is_day: 1 }).isDay).toBe(true);
    expect(toCurrent({}).isDay).toBeUndefined();
  });

  it("gives null, never zero, for a missing or non-numeric field", () => {
    const c = toCurrent({ temperature_2m: "warm", relative_humidity_2m: NaN });
    expect(c.temperature).toBeNull();
    expect(c.humidity).toBeNull();
    expect(c.windSpeed).toBeNull();
    expect(c.description).toBeUndefined();
  });

  it("does not invent a description for a code it does not know", () => {
    expect(toCurrent({ weather_code: 4242 }).description).toBeUndefined();
  });
});

describe("toDaily", () => {
  it("turns the parallel columns into one row per day", () => {
    const days = toDaily(weatherHarare.daily);
    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({
      date: "2026-11-01",
      tempMax: 31.1,
      tempMin: 15.1,
      precipitation: 0,
      precipitationProbability: 0,
      weatherCode: 0,
      description: "Clear sky",
    });
    expect(days[6].date).toBe("2026-11-07");
  });

  it("returns no rows when the block is missing or has no dates", () => {
    expect(toDaily(undefined)).toEqual([]);
    expect(toDaily({ temperature_2m_max: [1, 2] })).toEqual([]);
  });

  it("keeps a day whose other columns are short, with nulls", () => {
    const days = toDaily({
      time: ["2026-11-01", "2026-11-02"],
      weather_code: [3],
    });
    expect(days).toHaveLength(2);
    expect(days[1]).toMatchObject({
      date: "2026-11-02",
      tempMax: null,
      weatherCode: null,
    });
  });
});

describe("alignHourly", () => {
  it("starts at the place's current hour, not at midnight", () => {
    const hourly = alignHourly(weatherHarare.hourly, "2026-11-01T02:45");
    expect(hourly?.time[0]).toBe("2026-11-01T02:00");
    expect(hourly?.time).toHaveLength(36 - 2);
    expect(hourly?.temperature_2m[0]).toBe(
      weatherHarare.hourly.temperature_2m[2],
    );
  });

  it("keeps every column the same length", () => {
    const hourly = alignHourly(weatherHarare.hourly, "2026-11-01T10:00");
    const lengths = new Set(Object.values(hourly ?? {}).map((c) => c.length));
    expect(lengths.size).toBe(1);
  });

  it("is not moved by the phone's clock or zone", () => {
    // Same wall-clock text, same answer: only strings are compared.
    expect(alignHourly(weatherHarare.hourly, "2026-11-01T23:59")?.time[0]).toBe(
      "2026-11-01T23:00",
    );
  });

  it("hides a series that is entirely in the past", () => {
    expect(
      alignHourly(weatherHarare.hourly, "2026-11-09T00:00"),
    ).toBeUndefined();
  });

  it("returns the whole series when the reading has no time", () => {
    expect(alignHourly(weatherHarare.hourly, undefined)?.time).toHaveLength(36);
  });

  it("returns nothing without hourly times", () => {
    expect(alignHourly(undefined, "2026-11-01T02:45")).toBeUndefined();
    expect(
      alignHourly({ temperature_2m: [1] }, "2026-11-01T02:45"),
    ).toBeUndefined();
  });

  it("caps the series at 48 hours", () => {
    const time = Array.from(
      { length: 100 },
      (_, i) =>
        `2026-11-${String(1 + Math.floor(i / 24)).padStart(2, "0")}T${String(i % 24).padStart(2, "0")}:00`,
    );
    expect(alignHourly({ time }, "2026-11-01T00:10")?.time).toHaveLength(48);
  });
});

describe("toWeatherResponse", () => {
  it("assembles the whole model from the recorded answer", () => {
    const weather = toWeatherResponse(weatherHarare, {
      provider: "open-meteo:blend",
      fetchedAt: "2026-11-01T00:45:10Z",
    });
    expect(weather.current.temperature).toBe(15.6);
    expect(weather.daily).toHaveLength(7);
    expect(weather.hourly?.time[0]).toBe("2026-11-01T02:00");
    expect(weather.source).toBe("open-meteo");
    expect(weather.fetchedAt).toBe("2026-11-01T00:45:10Z");
    expect(weather.timezone).toBe("Africa/Harare");
    expect(weather.utcOffsetSeconds).toBe(7200);
    expect(weather.location).toBeUndefined();
  });

  it.each([
    ["open-meteo:blend", "open-meteo"],
    ["open-meteo:best_match", "open-meteo"],
    ["tomorrow", "tomorrow"],
    ["fallback", "fallback"],
    ["something-new", undefined],
    [null, undefined],
  ])("reads provider %s as source %s", (provider, source) => {
    expect(toWeatherResponse({}, { provider }).source).toBe(source);
  });

  it("copes with an empty answer", () => {
    const weather = toWeatherResponse({});
    expect(weather.daily).toEqual([]);
    expect(weather.hourly).toBeUndefined();
    expect(weather.current.temperature).toBeNull();
  });
});

describe("toForecast", () => {
  const forecast = toForecast(weatherHarare)!;

  it("keeps the whole recorded forecast in the shared model, for the place's own time", () => {
    expect(forecast.utc_offset_seconds).toBe(7200);
    expect(forecast.timezone).toBe("Africa/Harare");
    expect(forecast.current.temperature_2m).toBe(15.6);
    // The full series, not cut to the current hour: the tiles read "today".
    expect(forecast.hourly.time).toHaveLength(36);
    expect(forecast.hourly.time[0]).toBe("2026-11-01T00:00");
    expect(forecast.daily.time).toHaveLength(7);
    expect(forecast.daily.sunrise[0]).toBe("2026-11-01T05:16");
    expect(forecast.insights?.dewPoint).toBe(9);
  });

  it("carries every column the screens read, equal in length to the hours", () => {
    for (const key of [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "precipitation_probability",
      "precipitation",
      "weather_code",
      "visibility",
      "cloud_cover",
      "surface_pressure",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
      "uv_index",
      "is_day",
    ] as const) {
      expect(forecast.hourly[key]).toHaveLength(36);
    }
  });

  it("is a copy: changing it does not change the answer", () => {
    forecast.hourly.temperature_2m[0] = 99;
    expect(weatherHarare.hourly.temperature_2m[0]).not.toBe(99);
  });

  it("turns a missing column into an empty one, never undefined", () => {
    const raw = {
      current: { temperature_2m: 20 },
      hourly: { time: ["2026-11-01T00:00"], temperature_2m: [20] },
    };
    const f = toForecast(raw)!;
    expect(f.hourly.wind_gusts_10m).toEqual([]);
    expect(f.daily.sunrise).toEqual([]);
    expect(f.utc_offset_seconds).toBeUndefined();
  });

  it("is undefined when there is nothing to read", () => {
    expect(toForecast({})).toBeUndefined();
    expect(toForecast({ current: { temperature_2m: 1 } })).toBeUndefined();
    expect(
      toForecast({ hourly: { time: ["2026-11-01T00:00"] } }),
    ).toBeUndefined();
  });

  it("is on the converted response beside the aligned hourly columns", () => {
    const weather = toWeatherResponse(weatherHarare);
    expect(weather.forecast?.hourly.time).toHaveLength(36);
    expect(weather.hourly?.time[0]).toBe("2026-11-01T02:00");
  });
});

describe("fetchWeather", () => {
  it("asks /v1/weather for a coordinate, rounded to about 110 m", async () => {
    const calls = mockFetch({ body: weatherHarare, headers: PROVIDER_HEADERS });
    const weather = await fetchWeather({ lat: -17.8252, lon: 31.0341 });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`${BASE}/v1/weather?lat=-17.825&lon=31.034`);
    expect(calls[0].method).toBe("GET");
    expect(weather.current.temperature).toBe(15.6);
    expect(weather.source).toBe("open-meteo");
    expect(weather.fetchedAt).toBe("2026-11-01T00:45:10Z");
  });

  it("resolves a slug to its coordinate first, then asks for the weather", async () => {
    const calls = mockFetch(
      { body: locationHarare },
      { body: weatherHarare, headers: PROVIDER_HEADERS },
    );
    const weather = await fetchWeather({ slug: "harare" });
    expect(calls.map((c) => c.url)).toEqual([
      `${BASE}/v1/locations?slug=harare`,
      `${BASE}/v1/weather?lat=-17.83&lon=31.05`,
    ]);
    expect(weather.location).toEqual({
      slug: "harare",
      name: "Harare",
      province: "Harare",
      country: "ZW",
      lat: -17.83,
      lon: 31.05,
      // The place's height, for the detail pages' subtitle ("Harare · 1490m").
      elevation: 1490,
    });
  });

  it("fails with the Worker's 404 for an unknown slug, and asks no weather", async () => {
    const calls = mockFetch({ status: 404, body: errorNotFound });
    const err = await fetchWeather({ slug: "zzz-not-a-place" }).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 404, message: "Location not found" });
    expect(calls).toHaveLength(1);
  });

  it("surfaces a failing forecast as an ApiError", async () => {
    mockFetch({
      status: 502,
      body: {
        error: "upstream_error",
        error_description: "The service failed.",
      },
    });
    await expect(fetchWeather({ lat: 1, lon: 2 })).rejects.toMatchObject({
      status: 502,
      message: "The service failed.",
    });
  });

  it("labels the seasonal estimate the Worker serves when no provider answers", async () => {
    mockFetch({
      body: weatherHarare,
      headers: { "X-Weather-Provider": "fallback" },
    });
    expect((await fetchWeather({ lat: 1, lon: 2 })).source).toBe("fallback");
  });
});
