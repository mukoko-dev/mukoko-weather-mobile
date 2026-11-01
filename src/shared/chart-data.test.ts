/**
 * The chart data, with the web's own vectors (mukoko-weather
 * `src/components/weather/charts.test.ts` for `prepareHourlyData`,
 * `prepareDailyData`, `prepareAtmosphericData`, and `src/lib/location-time.test.ts`
 * for the two viewer-zone scenarios), plus what the phone adds: a missing
 * reading is a gap, never a zero, and a day is the place's calendar day.
 */

import { inViewerZone } from "@/test-utils/viewer-zone";
import {
  CHART_HOURS,
  dayName,
  dayOfMonth,
  prepareAtmosphericData,
  prepareDailyData,
  prepareHourlyData,
} from "./chart-data";
import type { DailyWeather, HourlyWeather } from "./weather";

const HOUR = 3_600_000;
const HARARE = 7200; // UTC+2
const SINGAPORE = 28800; // UTC+8
const pad = (n: number) => String(n).padStart(2, "0");

/** 48 hours of the web's mock: oscillating temperature, feels 2 degrees cooler, rain every 5th hour. */
function mockHourly(timeAt: (i: number) => string, n = 48): HourlyWeather {
  const idx = Array.from({ length: n }, (_, i) => i);
  const temp = (i: number) => 15 + Math.sin(i / 4) * 8;
  return {
    time: idx.map(timeAt),
    temperature_2m: idx.map(temp),
    apparent_temperature: idx.map((i) => temp(i) - 2),
    relative_humidity_2m: idx.map(() => 60),
    precipitation_probability: idx.map((i) => (i % 5 === 0 ? 30 : 0)),
    precipitation: idx.map(() => 0),
    weather_code: idx.map(() => 0),
    visibility: idx.map(() => 10000),
    cloud_cover: idx.map(() => 40),
    surface_pressure: idx.map(() => 1013.4),
    wind_speed_10m: idx.map(() => 10.4),
    wind_direction_10m: idx.map(() => 180),
    wind_gusts_10m: idx.map(() => 18.6),
    uv_index: idx.map(() => 3),
    is_day: idx.map(() => 1),
  };
}

/** Open-Meteo style: naive local strings from local midnight, 2026-10-08. */
const harareHourly = () =>
  mockHourly((i) => `2026-10-${pad(8 + Math.floor(i / 24))}T${pad(i % 24)}:00`);

/** Tomorrow.io style: zoned UTC instants from Singapore local midnight. */
const singaporeHourly = () => {
  const start = Date.UTC(2026, 9, 7, 16, 0, 0);
  return mockHourly((i) =>
    new Date(start + i * HOUR).toISOString().replace(".000Z", "Z"),
  );
};

const emptyHourly = (): HourlyWeather => mockHourly(() => "", 0);

function mockDaily(): DailyWeather {
  const days = 7;
  const dates = Array.from({ length: days }, (_, i) => `2026-02-${pad(10 + i)}`);
  const col = (f: (i: number) => number) => dates.map((_, i) => f(i));
  return {
    time: dates,
    weather_code: col((i) => (i === 0 ? 0 : 2)),
    temperature_2m_max: col((i) => 28 + i),
    temperature_2m_min: col((i) => 14 - i),
    apparent_temperature_max: col((i) => 29 + i),
    apparent_temperature_min: col((i) => 13 - i),
    sunrise: dates.map((d) => `${d}T05:30`),
    sunset: dates.map((d) => `${d}T18:30`),
    uv_index_max: col(() => 8),
    precipitation_sum: col((i) => i * 2),
    precipitation_probability_max: col((i) => i * 10),
    wind_speed_10m_max: col(() => 15),
    wind_gusts_10m_max: col(() => 25),
  };
}

// 06:30 UTC on 2026-10-08 is 08:30 in Harare.
const NOW = new Date(Date.UTC(2026, 9, 8, 6, 30));

describe("prepareHourlyData (the web's vectors)", () => {
  const hourly = harareHourly();

  it("returns exactly 24 data points", () => {
    expect(prepareHourlyData(hourly, HARARE, NOW)).toHaveLength(CHART_HOURS);
  });

  it("labels the first point as 'Now'", () => {
    expect(prepareHourlyData(hourly, HARARE, NOW)[0].label).toBe("Now");
  });

  it("rounds temperature and feels-like", () => {
    for (const p of prepareHourlyData(hourly, HARARE, NOW)) {
      expect(p.temp).toBe(Math.round(p.temp as number));
      expect(p.feelsLike).toBe(Math.round(p.feelsLike as number));
    }
  });

  it("preserves rain probability values", () => {
    const rainy = prepareHourlyData(hourly, HARARE, NOW).filter(
      (p) => (p.rain as number) > 0,
    );
    expect(rainy.length).toBeGreaterThan(0);
    for (const p of rainy) expect(p.rain).toBe(30);
  });

  it("returns an empty array for insufficient data", () => {
    expect(prepareHourlyData(emptyHourly(), HARARE, NOW)).toHaveLength(0);
  });

  it("each point has temp, feelsLike, rain and label fields", () => {
    for (const p of prepareHourlyData(hourly, HARARE, NOW)) {
      expect(typeof p.label).toBe("string");
      expect(typeof p.temp).toBe("number");
      expect(typeof p.feelsLike).toBe("number");
      expect(typeof p.rain).toBe("number");
    }
  });

  it("stops at the end of the series instead of padding", () => {
    // The series ends at 23:00 on the 9th; from 08:00 on the 9th that is 16 hours.
    const late = new Date(Date.UTC(2026, 9, 9, 6, 30));
    expect(prepareHourlyData(hourly, HARARE, late)).toHaveLength(16);
  });
});

describe("prepareDailyData (the web's vectors)", () => {
  const daily = mockDaily();

  it("returns 7 data points for a 7-day forecast", () => {
    expect(prepareDailyData(daily)).toHaveLength(7);
  });

  it("labels the first day 'Today' and the rest with short weekdays", () => {
    const data = prepareDailyData(daily);
    expect(data[0].day).toBe("Today");
    for (const p of data.slice(1)) {
      expect(p.day).not.toBe("Today");
      expect(p.day.length).toBeLessThanOrEqual(4);
    }
  });

  it("rounds, keeps high above low, and the range tuple is [low, high]", () => {
    for (const p of prepareDailyData(daily)) {
      expect(p.high).toBe(Math.round(p.high as number));
      expect(p.feelsLow).toBe(Math.round(p.feelsLow as number));
      expect(p.high as number).toBeGreaterThan(p.low as number);
      expect(p.range).toEqual([p.low, p.high]);
    }
  });

  it("preserves precipitation probability", () => {
    const data = prepareDailyData(daily);
    expect(data[0].rain).toBe(0);
    expect(data[1].rain).toBe(10);
  });

  it("names the weekdays of the place's dates (2026-02-11 is a Wednesday)", () => {
    const names = prepareDailyData(daily).map((p) => p.day);
    expect(names).toEqual(["Today", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon"]);
  });
});

describe("prepareAtmosphericData (the web's vectors)", () => {
  const hourly = harareHourly();

  it("returns 24 points, 'Now' first, and an empty array for no data", () => {
    const data = prepareAtmosphericData(hourly, HARARE, NOW);
    expect(data).toHaveLength(CHART_HOURS);
    expect(data[0].label).toBe("Now");
    expect(prepareAtmosphericData(emptyHourly(), HARARE, NOW)).toHaveLength(0);
  });

  it("each point has every atmospheric field as a number", () => {
    for (const p of prepareAtmosphericData(hourly, HARARE, NOW)) {
      for (const k of [
        "humidity",
        "cloudCover",
        "pressure",
        "windSpeed",
        "windGusts",
        "uvIndex",
      ] as const) {
        expect(typeof p[k]).toBe("number");
      }
    }
  });

  it("rounds pressure and wind, and keeps humidity, cloud and UV as given", () => {
    const [p] = prepareAtmosphericData(hourly, HARARE, NOW);
    expect(p.pressure).toBe(1013);
    expect(p.windSpeed).toBe(10);
    expect(p.windGusts).toBe(19);
    expect(p.humidity).toBe(60);
    expect(p.uvIndex).toBe(3);
  });
});

describe("a reading the forecast does not have", () => {
  it("is a gap (null), never a zero", () => {
    const h = harareHourly();
    h.temperature_2m[9] = null as unknown as number;
    h.precipitation_probability[9] = Number.NaN;
    h.surface_pressure[10] = null as unknown as number;
    const hourly = prepareHourlyData(h, HARARE, NOW);
    expect(hourly[1].temp).toBeNull();
    expect(hourly[1].rain).toBeNull();
    expect(hourly[0].temp).not.toBeNull();
    expect(prepareAtmosphericData(h, HARARE, NOW)[2].pressure).toBeNull();
  });

  it("a short column leaves nulls rather than throwing", () => {
    const h = harareHourly();
    h.uv_index = [];
    expect(prepareAtmosphericData(h, HARARE, NOW)[0].uvIndex).toBeNull();
  });
});

describe("day names", () => {
  it("reads the place's date, not the phone's", () => {
    expect(dayName("2026-10-08", 1)).toBe("Thu");
    expect(dayName("2026-10-08T23:59", 1)).toBe("Thu");
    expect(dayName("2026-10-08", 0)).toBe("Today");
    expect(dayName("garbage", 1)).toBe("—");
    expect(dayOfMonth("2026-10-08")).toBe(8);
  });
});

// The two required scenarios, with the phone's own clock made hostile: any
// path that reads it throws (src/test-utils/viewer-zone.ts).
inViewerZone("Australia/Perth", 480, () => {
  const h = harareHourly();
  it("starts at Harare's 08:00, not Perth's 14:00", () => {
    const chart = prepareHourlyData(h, HARARE, NOW);
    expect(chart[0].label).toBe("Now");
    expect(chart[0].temp).toBe(Math.round(15 + Math.sin(8 / 4) * 8));
    expect(chart[1].label).toBe("09:00");
    expect(chart[23].label).toBe("07:00");
    expect(prepareAtmosphericData(h, HARARE, NOW)[1].label).toBe("09:00");
  });
  it("names days from the dates, with no local-time read", () => {
    expect(prepareDailyData(mockDaily())[1].day).toBe("Wed");
  });
});

inViewerZone("America/Bogota", -300, () => {
  // 03:15 UTC is 22:15 on the 7th in Bogota, 11:15 on the 8th in Singapore.
  const at = new Date(Date.UTC(2026, 9, 8, 3, 15));
  const h = singaporeHourly();
  it("labels zoned instants on Singapore's clock", () => {
    expect(h.time[11]).toBe("2026-10-08T03:00:00Z");
    const chart = prepareHourlyData(h, SINGAPORE, at);
    expect(chart[0].temp).toBe(Math.round(15 + Math.sin(11 / 4) * 8));
    expect(chart[1].label).toBe("12:00");
    expect(prepareAtmosphericData(h, SINGAPORE, at)[2].label).toBe("13:00");
  });
});
