/** The in-memory memory of the last weather shown for a place. */

import { type WeatherResponse } from "@/api/weather";

import {
  WEATHER_CACHE_MAX,
  WEATHER_CACHE_TTL_MS,
  clearWeatherCache,
  recallPlaceName,
  recallWeather,
  rememberWeather,
} from "./weather-cache";

const w = (n: number) =>
  ({ current: { temperature: n } }) as unknown as WeatherResponse;

beforeEach(clearWeatherCache);

describe("weather cache", () => {
  it("remembers a place and gives it back", () => {
    const answer = w(1);
    rememberWeather("harare", answer, 1000);
    expect(recallWeather("harare", 1000)).toBe(answer);
    expect(recallWeather("unknown", 1000)).toBeUndefined();
  });

  it("forgets after the time to live", () => {
    rememberWeather("harare", w(1), 0);
    expect(recallWeather("harare", WEATHER_CACHE_TTL_MS)).toBeDefined();
    expect(recallWeather("harare", WEATHER_CACHE_TTL_MS + 1)).toBeUndefined();
    // And it is gone for good, not just hidden.
    expect(recallWeather("harare", 0)).toBeUndefined();
  });

  it("never remembers the seasonal estimate, and drops an older real answer", () => {
    rememberWeather("harare", w(1), 0);
    rememberWeather(
      "harare",
      { ...w(2), source: "fallback" } as WeatherResponse,
      10,
    );
    expect(recallWeather("harare", 10)).toBeUndefined();
    rememberWeather(
      "bulawayo",
      { ...w(3), source: "fallback" } as WeatherResponse,
      10,
    );
    expect(recallWeather("bulawayo", 10)).toBeUndefined();
    // A real answer is remembered as before.
    rememberWeather(
      "harare",
      { ...w(4), source: "open-meteo" } as WeatherResponse,
      20,
    );
    expect(recallWeather("harare", 20)?.current.temperature).toBe(4);
  });

  it("keeps the newest answer for a place", () => {
    rememberWeather("harare", w(1), 0);
    rememberWeather("harare", w(2), 10);
    expect(recallWeather("harare", 10)?.current.temperature).toBe(2);
  });

  it("drops the oldest place past the limit", () => {
    for (let i = 0; i <= WEATHER_CACHE_MAX; i++)
      rememberWeather(`p${i}`, w(i), 0);
    expect(recallWeather("p0", 0)).toBeUndefined();
    expect(recallWeather("p1", 0)).toBeDefined();
    expect(recallWeather(`p${WEATHER_CACHE_MAX}`, 0)).toBeDefined();
  });

  it("clears", () => {
    rememberWeather("harare", w(1), 0);
    clearWeatherCache();
    expect(recallWeather("harare", 0)).toBeUndefined();
  });

  it("keeps the name the linking page showed, for as long as the answer", () => {
    rememberWeather("strathaven--ksy4dd7", w(1), 0, "Strathaven");
    expect(recallPlaceName("strathaven--ksy4dd7", 0)).toBe("Strathaven");
    expect(
      recallPlaceName("strathaven--ksy4dd7", WEATHER_CACHE_TTL_MS + 1),
    ).toBeUndefined();
    expect(recallPlaceName("unknown", 0)).toBeUndefined();
  });
});
