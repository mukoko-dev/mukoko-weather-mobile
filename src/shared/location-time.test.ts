/**
 * Location time — "the current hour" and every hour label follow the
 * LOCATION's time zone, whoever is looking and wherever they are.
 *
 * The two required scenarios run with the process time zone actually set to
 * the viewer's zone (Node re-reads `process.env.TZ` on assignment), so any
 * code path that still reads the viewer's clock fails here:
 *
 *   1. a viewer in UTC+8 (Perth) looking at Harare (UTC+2, naive
 *      Open-Meteo wall-clock strings)
 *   2. a viewer in UTC-5 (Bogotá) looking at Singapore (UTC+8, zoned
 *      instants)
 */

import type { HourlyWeather, WeatherData } from "./weather";
import {
  currentHourIndex,
  hasZone,
  instantMs,
  locationClockLabel,
  locationDateString,
  locationHourLabel,
  locationHourNow,
  longitudeOffsetSeconds,
  resolveOffsetSeconds,
  viewerOffsetSeconds,
  wallClockMs,
} from "./location-time";
import { hourlySummary } from "./hourly-summary";
import { heroOutlook, currentHourIndex as heroCurrentHourIndex } from "./hero";
import { sunInsight } from "./metric-insights";
import { inViewerZone } from "@/test-utils/viewer-zone";

const HOUR = 3_600_000;
const HARARE = 7200; // UTC+2
const SINGAPORE = 28800; // UTC+8

const pad = (n: number) => String(n).padStart(2, "0");

/** 48 hours of hourly data; `time[i]` from `timeAt(i)`, code from `codeAt(i)`. */
function hourly(
  timeAt: (i: number) => string,
  codeAt: (i: number) => number = () => 0,
  n = 48,
): HourlyWeather {
  const fill = (v: number) => Array.from({ length: n }, () => v);
  return {
    time: Array.from({ length: n }, (_, i) => timeAt(i)),
    weather_code: Array.from({ length: n }, (_, i) => codeAt(i)),
    temperature_2m: Array.from({ length: n }, (_, i) => i), // temp == index
    apparent_temperature: fill(20),
    relative_humidity_2m: fill(50),
    precipitation_probability: fill(0),
    precipitation: Array.from({ length: n }, (_, i) => i / 10),
    visibility: fill(20000),
    cloud_cover: fill(20),
    surface_pressure: fill(1010),
    wind_speed_10m: fill(5),
    wind_direction_10m: fill(90),
    wind_gusts_10m: fill(8),
    uv_index: fill(3),
    is_day: fill(1),
  };
}

/** Open-Meteo style: naive local strings from local midnight, 2026-10-08. */
function harareHourly(codeAt?: (i: number) => number): HourlyWeather {
  return hourly((i) => {
    const day = 8 + Math.floor(i / 24);
    return `2026-10-${pad(day)}T${pad(i % 24)}:00`;
  }, codeAt);
}

/** Tomorrow.io style: zoned UTC instants from Singapore local midnight. */
function singaporeHourly(codeAt?: (i: number) => number): HourlyWeather {
  // Singapore 2026-10-08 00:00 = 2026-10-07 16:00 UTC
  const start = Date.UTC(2026, 9, 7, 16, 0, 0);
  return hourly(
    (i) => new Date(start + i * HOUR).toISOString().replace(".000Z", "Z"),
    codeAt,
  );
}

function weather(
  h: HourlyWeather,
  offset: number,
  daily?: Partial<WeatherData["daily"]>,
): WeatherData {
  return {
    current: {
      temperature_2m: 20,
      relative_humidity_2m: 50,
      apparent_temperature: 20,
      precipitation: 0,
      weather_code: 0,
      cloud_cover: 20,
      wind_speed_10m: 5,
      wind_direction_10m: 90,
      wind_gusts_10m: 8,
      uv_index: 3,
      surface_pressure: 1010,
      is_day: 1,
    },
    hourly: h,
    daily: {
      time: [],
      weather_code: [],
      temperature_2m_max: [],
      temperature_2m_min: [],
      apparent_temperature_max: [],
      apparent_temperature_min: [],
      sunrise: [],
      sunset: [],
      uv_index_max: [],
      precipitation_sum: [],
      precipitation_probability_max: [],
      wind_speed_10m_max: [],
      wind_gusts_10m_max: [],
      ...daily,
    },
    current_units: {},
    utc_offset_seconds: offset,
  };
}

// ---------------------------------------------------------------------------
// Scenario 1 — viewer in UTC+8 (Perth) looking at Harare (UTC+2)
// ---------------------------------------------------------------------------

inViewerZone("Australia/Perth", 480, () => {
  // 06:30 UTC → 14:30 in Perth, 08:30 in Harare.
  const NOW = new Date(Date.UTC(2026, 9, 8, 6, 30));
  // Rain from Harare 10:00 onwards (index 10).
  const h = harareHourly((i) => (i >= 10 ? 61 : 0));
  const w = weather(h, HARARE, {
    time: ["2026-10-08", "2026-10-09"],
    sunrise: ["2026-10-08T05:46", "2026-10-09T05:45"],
    sunset: ["2026-10-08T18:11", "2026-10-09T18:12"],
  });

  it("starts at Harare's 08:00, not Perth's 14:00", () => {
    expect(currentHourIndex(h.time, HARARE, NOW)).toBe(8);
    expect(heroCurrentHourIndex(h.time, NOW, HARARE)).toBe(8);
    expect(locationHourNow(HARARE, NOW)).toBe(8);
    expect(locationDateString(HARARE, NOW)).toBe("2026-10-08");
  });

  it("labels hours on Harare's clock", () => {
    expect(locationHourLabel(h.time[8], HARARE)).toBe("08:00");
    expect(locationClockLabel(h.time[9], HARARE)).toBe("09:00");
  });

  it("hero outlook names Harare's rain hour", () => {
    expect(heroOutlook(h, NOW, HARARE)).toMatch(/around 10:00/);
    expect(hourlySummary(h, 8, HARARE)).toMatch(/around 10:00/);
  });

  it("sun card reads Harare's sunset as the next event", () => {
    const sun = sunInsight(w, NOW);
    expect(sun.sunrise).toBe("05:46");
    expect(sun.sunset).toBe("18:11");
  });
});

// ---------------------------------------------------------------------------
// Scenario 2 — viewer in UTC-5 (Bogotá) looking at Singapore (UTC+8)
// ---------------------------------------------------------------------------

inViewerZone("America/Bogota", -300, () => {
  // 03:15 UTC → 22:15 on the 7th in Bogotá, 11:15 on the 8th in Singapore.
  const NOW = new Date(Date.UTC(2026, 9, 8, 3, 15));
  // Storm from Singapore 14:00 (index 14).
  const h = singaporeHourly((i) => (i >= 14 ? 95 : 1));
  const w = weather(h, SINGAPORE, {
    time: ["2026-10-08", "2026-10-09"],
    sunrise: ["2026-10-07T22:57:00Z", "2026-10-08T22:57:00Z"],
    sunset: ["2026-10-08T11:03:00Z", "2026-10-09T11:03:00Z"],
  });

  it("starts at Singapore's 11:00, not Bogotá's 22:00", () => {
    expect(currentHourIndex(h.time, SINGAPORE, NOW)).toBe(11);
    expect(heroCurrentHourIndex(h.time, NOW, SINGAPORE)).toBe(11);
    expect(locationDateString(SINGAPORE, NOW)).toBe("2026-10-08");
  });

  it("labels zoned instants on Singapore's clock", () => {
    expect(h.time[11]).toBe("2026-10-08T03:00:00Z");
    expect(locationHourLabel(h.time[11], SINGAPORE)).toBe("11:00");
  });

  it("hero outlook names Singapore's storm hour", () => {
    expect(heroOutlook(h, NOW, SINGAPORE)).toMatch(/around 14:00/);
  });

  it("sun times are Singapore's", () => {
    const sun = sunInsight(w, NOW);
    expect(sun.sunrise).toBe("06:57");
    expect(sun.sunset).toBe("19:03");
  });
});

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

describe("location-time helpers", () => {
  it("tells zoned instants from naive wall-clock strings", () => {
    expect(hasZone("2026-10-08T14:00")).toBe(false);
    expect(hasZone("2026-10-08T14:00:00")).toBe(false);
    expect(hasZone("2026-10-08")).toBe(false);
    expect(hasZone("2026-10-08T14:00:00Z")).toBe(true);
    expect(hasZone("2026-10-08T14:00:00+00:00")).toBe(true);
    expect(hasZone("2026-10-08T14:00-05:00")).toBe(true);
  });

  it("wall clock and instant agree for both string kinds", () => {
    const naive = "2026-10-08T14:00";
    expect(wallClockMs(naive, HARARE)).toBe(Date.UTC(2026, 9, 8, 14));
    expect(instantMs(naive, HARARE)).toBe(Date.UTC(2026, 9, 8, 12));
    const zoned = "2026-10-08T12:00:00Z";
    expect(wallClockMs(zoned, HARARE)).toBe(Date.UTC(2026, 9, 8, 14));
    expect(instantMs(zoned, HARARE)).toBe(Date.UTC(2026, 9, 8, 12));
    expect(wallClockMs("garbage", HARARE)).toBeNull();
    expect(wallClockMs(undefined, HARARE)).toBeNull();
  });

  it("half-hour zones label their own hours", () => {
    // India UTC+05:30 — 2026-10-08T06:30Z is 12:00 IST.
    expect(locationClockLabel("2026-10-08T06:30:00Z", 19800)).toBe("12:00");
    expect(locationHourNow(19800, new Date(Date.UTC(2026, 9, 8, 6, 45)))).toBe(
      12,
    );
  });

  it("crosses the date line on the location's calendar", () => {
    // 2026-10-08T20:00Z is already the 9th in Auckland (UTC+13 in October).
    expect(locationDateString(46800, new Date(Date.UTC(2026, 9, 8, 20)))).toBe(
      "2026-10-09",
    );
  });

  it("an explicit offset always wins; missing falls back to the viewer", () => {
    expect(resolveOffsetSeconds(0)).toBe(0);
    expect(resolveOffsetSeconds(-18000)).toBe(-18000);
    const now = new Date();
    expect(resolveOffsetSeconds(undefined, now)).toBe(viewerOffsetSeconds(now));
    expect(resolveOffsetSeconds(Number.NaN, now)).toBe(
      viewerOffsetSeconds(now),
    );
  });

  it("returns 0 for an empty or stale series", () => {
    expect(currentHourIndex([], HARARE)).toBe(0);
    expect(currentHourIndex(["2000-01-01T00:00"], HARARE)).toBe(0);
  });

  it("estimates an offset from longitude in quarter hours", () => {
    expect(longitudeOffsetSeconds(31.05)).toBe(7200);
    expect(longitudeOffsetSeconds(-74)).toBe(-18000);
    expect(longitudeOffsetSeconds(82.5)).toBe(19800);
    expect(longitudeOffsetSeconds(Number.NaN)).toBe(0);
  });
});
