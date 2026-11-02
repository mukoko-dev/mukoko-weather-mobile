/**
 * The six chart configs are the web's: the same series, labels, colours (by
 * weather convention), styles and axis rules (mukoko-weather
 * `src/components/weather/HourlyChart.tsx`, `DailyChart.tsx` and
 * `charts/{HumidityCloud,WindSpeed,Pressure,UVIndex}Chart.tsx`).
 */

import { WX_UV } from "@/theme/mzizi";
import { WX_SERIES_LIGHT } from "@/theme/wx-series";

import { DAILY_SERIES, dailyAxes } from "./DailyChart";
import { HOURLY_SERIES, hourlyAxes, hourlyValue } from "./HourlyChart";
import { HUMIDITY_CLOUD_SERIES } from "./HumidityCloudChart";
import { PRESSURE_SERIES, pressureAxes } from "./PressureChart";
import { UV_SERIES, uvAxes, uvBarColor } from "./UVIndexChart";
import { WIND_SERIES, windAxes } from "./WindSpeedChart";

const brief = (series: { key: string; label: string; color: string }[]) =>
  series.map((s) => `${s.key}|${s.label}|${s.color}`);

describe("series (the web's configs)", () => {
  it("hourly: temperature area, feels-like dashed, rain bars on their own axis", () => {
    expect(brief(HOURLY_SERIES)).toEqual([
      "temp|Temperature|temp",
      "feelsLike|Feels Like|feels",
      "rain|Rain %|rainProb",
    ]);
    const [temp, feels, rain] = HOURLY_SERIES;
    expect(temp).toMatchObject({ fill: true, order: 1 });
    expect(feels).toMatchObject({ dashed: true, order: 2 });
    expect(rain).toMatchObject({
      type: "bar",
      opacity: 0.35,
      yAxisID: "rain",
      order: 3,
    });
  });

  it("daily: high and low filled with dots, feels high and low dashed, each its own colour", () => {
    expect(brief(DAILY_SERIES)).toEqual([
      "high|High|temp",
      "low|Low|tempLow",
      "feelsHigh|Feels High|feels",
      "feelsLow|Feels Low|feelsLow",
    ]);
    expect(DAILY_SERIES[0]).toMatchObject({ fill: true, showDots: true });
    expect(DAILY_SERIES[1]).toMatchObject({ fill: true, dashed: true });
    expect(new Set(DAILY_SERIES.map((s) => s.color)).size).toBe(4);
  });

  it("humidity area with cloud dashed, wind with gusts dashed, pressure a line", () => {
    expect(brief(HUMIDITY_CLOUD_SERIES)).toEqual([
      "humidity|Humidity|humidity",
      "cloudCover|Cloud Cover|cloud",
    ]);
    expect(HUMIDITY_CLOUD_SERIES[0]).toMatchObject({
      fill: true,
      opacity: 0.3,
    });
    expect(HUMIDITY_CLOUD_SERIES[1].dashed).toBe(true);
    expect(brief(WIND_SERIES)).toEqual([
      "windSpeed|Wind Speed|wind",
      "windGusts|Wind Gusts|gust",
    ]);
    expect(WIND_SERIES[1].dashed).toBe(true);
    expect(brief(PRESSURE_SERIES)).toEqual(["pressure|Pressure|pressure"]);
  });

  it("every colour is a named weather series, never a brand mineral", () => {
    const all = [
      ...HOURLY_SERIES,
      ...DAILY_SERIES,
      ...HUMIDITY_CLOUD_SERIES,
      ...WIND_SERIES,
      ...PRESSURE_SERIES,
    ];
    for (const s of all) expect(s.color in WX_SERIES_LIGHT).toBe(true);
  });

  it("UV: bars coloured by the WHO band of each value", () => {
    expect(UV_SERIES[0]).toMatchObject({ type: "bar", opacity: 0.6 });
    expect(UV_SERIES[0].colorByValue).toBe(uvBarColor);
    expect([0, 3, 6, 9, 11].map(uvBarColor)).toEqual([...WX_UV]);
    expect(uvBarColor(null)).toBe(WX_UV[0]);
  });
});

describe("axes (the web's rules)", () => {
  const point = (over: object) => ({
    label: "x",
    temp: 20,
    feelsLike: 20,
    rain: 0,
    ...over,
  });

  it("hourly: two degrees either side of temperature and feels like; rain 0 to 100, hidden", () => {
    const axes = hourlyAxes([
      point({ temp: 18, feelsLike: 16 }),
      point({ temp: 27, feelsLike: 29 }),
    ]);
    expect(axes.y).toMatchObject({ min: 14, max: 31, position: "left" });
    expect(axes.y.format(21)).toBe("21°");
    expect(axes.rain).toMatchObject({
      min: 0,
      max: 100,
      display: false,
      position: "right",
    });
  });

  it("hourly: skips a missing reading", () => {
    const axes = hourlyAxes([
      point({ temp: null, feelsLike: 10 }),
      point({ temp: 12, feelsLike: null }),
    ]);
    expect(axes.y).toMatchObject({ min: 8, max: 14 });
  });

  it("daily: covers every high, low and feels like, two degrees either side", () => {
    const axes = dailyAxes([
      {
        day: "a",
        high: 30,
        low: 12,
        feelsHigh: 32,
        feelsLow: 10,
        range: [12, 30],
        rain: 0,
      },
      {
        day: "b",
        high: 28,
        low: 14,
        feelsHigh: 29,
        feelsLow: 13,
        range: [14, 28],
        rain: 0,
      },
    ]);
    expect(axes.y).toMatchObject({ min: 8, max: 34 });
  });

  it("wind: from zero to the strongest reading plus 5, or 25 with none", () => {
    const row = (windSpeed: number | null, windGusts: number | null) => ({
      label: "x",
      humidity: 0,
      cloudCover: 0,
      pressure: 0,
      uvIndex: 0,
      windSpeed,
      windGusts,
    });
    expect(windAxes([row(10, 22), row(8, 18)]).y).toEqual({ min: 0, max: 27 });
    expect(windAxes([row(null, null)]).y).toEqual({ min: 0, max: 25 });
    expect(windAxes([]).y).toEqual({ min: 0, max: 25 });
  });

  it("pressure: the data's range, 2 hPa either side; 1010 to 1020 with none", () => {
    const row = (pressure: number | null) => ({
      label: "x",
      humidity: 0,
      cloudCover: 0,
      windSpeed: 0,
      windGusts: 0,
      uvIndex: 0,
      pressure,
    });
    expect(pressureAxes([row(1011), row(1016)]).y).toEqual({
      min: 1009,
      max: 1018,
    });
    expect(pressureAxes([row(null)]).y).toEqual({ min: 1010, max: 1020 });
  });

  it("uv: zero to 12, or one above a stronger reading", () => {
    const row = (uvIndex: number | null) => ({
      label: "x",
      humidity: 0,
      cloudCover: 0,
      pressure: 0,
      windSpeed: 0,
      windGusts: 0,
      uvIndex,
    });
    expect(uvAxes([row(3), row(9)]).y).toEqual({ min: 0, max: 12 });
    expect(uvAxes([row(14)]).y).toEqual({ min: 0, max: 15 });
    expect(uvAxes([row(null)]).y).toEqual({ min: 0, max: 12 });
  });

  it("how a value reads: degrees, and the rain chance as a percent", () => {
    expect(hourlyValue("Temperature", 21)).toBe("21°C");
    expect(hourlyValue("Feels Like", 19)).toBe("19°C");
    expect(hourlyValue("Rain %", 30)).toBe("30%");
  });
});
