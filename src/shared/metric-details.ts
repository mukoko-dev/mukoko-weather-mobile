/**
 * Detail view for every Conditions tile (Apple Weather opens a full card when
 * a tile is tapped; ours opens `MetricDetailModal`). Pure functions over
 * WeatherData: the next 24 hours as a chart series, the stats a person wants
 * next to it, and one plain sentence on what the number means. No network and
 * no AI call, and nothing here reads the viewer's clock or time zone.
 */

import type { WeatherData, HourlyWeather, DailyWeather } from "./weather";
import { windDirection, uvLevel } from "./weather";
import { dewPointFromTempHumidity } from "./dew-point";
import { currentHourIndex, locationClockLabel } from "./location-time";
import {
  feelsLikeInsight,
  humidityInsight,
  precipitationInsight,
  pressureInsight,
  sunInsight,
  temperatureAverageInsight,
  uvInsight,
  visibilityInsight,
  windInsight,
} from "./metric-insights";

export const METRIC_KINDS = [
  "wind",
  "uv",
  "feels",
  "visibility",
  "rain",
  "humidity",
  "pressure",
  "sun",
  "moon",
  "averages",
] as const;

export type MetricKind = (typeof METRIC_KINDS)[number];

/** Which chart the modal draws for a metric (null = stats only). */
export type MetricChart =
  | "wind"
  | "uv"
  | "feels"
  | "visibility"
  | "rain"
  | "humidity"
  | "pressure"
  | null;

export const METRIC_CHART: Record<MetricKind, MetricChart> = {
  wind: "wind",
  uv: "uv",
  feels: "feels",
  visibility: "visibility",
  rain: "rain",
  humidity: "humidity",
  pressure: "pressure",
  sun: null,
  moon: null,
  averages: null,
};

export const METRIC_TITLES: Record<MetricKind, string> = {
  wind: "Wind",
  uv: "UV index",
  feels: "Feels like",
  visibility: "Visibility",
  rain: "Precipitation",
  humidity: "Humidity",
  pressure: "Pressure",
  sun: "Sun",
  moon: "Moon",
  averages: "Averages",
};

export function isMetricKind(value: unknown): value is MetricKind {
  return (
    typeof value === "string" &&
    (METRIC_KINDS as readonly string[]).includes(value)
  );
}

/**
 * One hour of a detail chart. A reading the forecast has no value for is
 * `null`, a gap in the line, never a zero: a missing pressure drawn as 0 hPa
 * would collapse the whole axis, and a missing visibility would be a false dip
 * to 0 km.
 */
export type MetricSeriesPoint = {
  label: string;
  windSpeed: number | null;
  windGusts: number | null;
  uvIndex: number | null;
  temperature: number | null;
  feelsLike: number | null;
  visibility: number | null;
  precipitation: number | null;
  rainProbability: number | null;
  humidity: number | null;
  dewPoint: number | null;
  pressure: number | null;
};

const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

/** A reading, or `null` when the forecast has none for that hour. */
const maybe = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** A reading mapped through `f`, or `null` when it is missing. */
const mapped = (v: unknown, f: (n: number) => number): number | null => {
  const n = maybe(v);
  return n === null ? null : f(n);
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Up to 24 hourly points starting at the LOCATION's current hour. */
export function metricSeries(
  hourly: HourlyWeather | undefined,
  offsetSeconds: number,
  now: Date,
): MetricSeriesPoint[] {
  if (!hourly?.time?.length) return [];
  const start = currentHourIndex(hourly.time, offsetSeconds, now);
  const points: MetricSeriesPoint[] = [];
  for (let i = 0; i < 24 && start + i < hourly.time.length; i++) {
    const idx = start + i;
    const temp = maybe(hourly.temperature_2m?.[idx]);
    const rh = maybe(hourly.relative_humidity_2m?.[idx]);
    const dew = maybe(hourly.dew_point_2m?.[idx]);
    const feels = maybe(hourly.apparent_temperature?.[idx]) ?? temp;
    points.push({
      label:
        i === 0 ? "Now" : locationClockLabel(hourly.time[idx], offsetSeconds),
      windSpeed: mapped(hourly.wind_speed_10m?.[idx], Math.round),
      windGusts: mapped(hourly.wind_gusts_10m?.[idx], Math.round),
      uvIndex: mapped(hourly.uv_index?.[idx], round1),
      temperature: temp === null ? null : Math.round(temp),
      feelsLike: feels === null ? null : Math.round(feels),
      // Open-Meteo reports visibility in metres; the card speaks kilometres.
      visibility: mapped(hourly.visibility?.[idx], (m) => round1(m / 1000)),
      precipitation: mapped(hourly.precipitation?.[idx], round1),
      rainProbability: mapped(
        hourly.precipitation_probability?.[idx],
        Math.round,
      ),
      humidity: rh === null ? null : Math.round(rh),
      // The model's own dew point, else Magnus from a real temperature and
      // humidity; with neither there is nothing to draw.
      dewPoint:
        dew !== null
          ? Math.round(dew)
          : temp !== null && rh !== null
            ? Math.round(dewPointFromTempHumidity(temp, rh))
            : null,
      pressure: mapped(hourly.surface_pressure?.[idx], Math.round),
    });
  }
  return points;
}

export interface MetricStat {
  label: string;
  value: string;
}

export interface MetricDetail {
  kind: MetricKind;
  title: string;
  /** The big number or phrase at the top of the modal. */
  headline: string;
  /** The same one-line insight the tile shows. */
  sentence: string;
  stats: MetricStat[];
  /** What the metric is, in one or two plain sentences. */
  about: string;
}

export interface MetricExtras {
  /** Today's forecast high, °C. */
  todayHigh?: number | null;
  /** Climate-normal high for today, °C. */
  normalHigh?: number | null;
  moonName?: string;
  moonIlluminationPct?: number;
  /** Next moonrise in the place's time zone, e.g. "19:42" or "19:42 tomorrow". */
  moonrise?: string | null;
}

const ABOUT: Record<MetricKind, string> = {
  wind: "Wind is air moving across the ground. Gusts are the short peaks above the steady speed, and they are what moves branches, kites and loads on a truck.",
  uv: "The UV index rates how fast unprotected skin burns. From 3 upwards, shade, a hat and sunscreen matter. It is highest around midday and falls to zero at night.",
  feels:
    "Feels like blends the air temperature with humidity and wind to show what your body reads. Humid air feels warmer, wind on a cool day feels colder.",
  visibility:
    "Visibility is how far you can see a dark object against the sky. Haze, smoke, dust, mist and rain all shorten it, which matters for driving and flying.",
  rain: "Precipitation is the rain that has fallen or is forecast, in millimetres. One millimetre is a litre on every square metre of ground.",
  humidity:
    "Relative humidity is how full the air is with water vapour. The dew point is the temperature at which that vapour turns to dew: above 20 degrees the air feels muggy.",
  pressure:
    "Air pressure at the surface. A steady fall often comes before wind and rain, a steady rise before fair weather.",
  sun: "Sunrise and sunset in the place's own time zone, and how long the day is. The dotted line shows where the sun is on its arc now.",
  moon: "The moon phase and how much of its face is lit. The phase is the same everywhere on Earth, but it looks mirrored in the southern hemisphere.",
  averages:
    "Today's forecast high against the 1991-2020 average high for this date at this place, so a hot or cool day reads in context.",
};

const dash = "-";
const deg = (v: number | null | undefined) =>
  typeof v === "number" && Number.isFinite(v) ? `${Math.round(v)}°` : dash;

export function metricDetail(
  kind: MetricKind,
  data: WeatherData,
  now: Date,
  extras: MetricExtras = {},
): MetricDetail {
  const base = { kind, title: METRIC_TITLES[kind], about: ABOUT[kind] };
  switch (kind) {
    case "wind": {
      const w = windInsight(data, now);
      return {
        ...base,
        headline: `${w.speed} km/h ${w.directionLabel}`,
        sentence: w.sentence,
        stats: [
          { label: "Gusts", value: `${w.gust} km/h` },
          {
            label: "Direction",
            value: `${w.directionLabel} (${Math.round(w.directionDeg)}°)`,
          },
          { label: "Beaufort", value: w.beaufortLabel },
        ],
      };
    }
    case "uv": {
      const u = uvInsight(data, now);
      return {
        ...base,
        headline: `${u.value} ${u.label}`,
        sentence: u.sentence,
        stats: [
          {
            label: "Peak today",
            value: `${u.peakToday}${u.peakTime ? ` at ${u.peakTime}` : ""}`,
          },
          { label: "Protect from", value: u.protectFrom ?? dash },
          { label: "Protect until", value: u.protectUntil ?? dash },
        ],
      };
    }
    case "feels": {
      const f = feelsLikeInsight(data);
      const c = data.current;
      return {
        ...base,
        headline: `${f.value}°`,
        sentence: f.sentence,
        stats: [
          { label: "Actual", value: deg(c?.temperature_2m) },
          {
            label: "Difference",
            value: `${f.delta > 0 ? "+" : ""}${f.delta}°`,
          },
          {
            label: "Humidity",
            value: `${Math.round(num(c?.relative_humidity_2m))}%`,
          },
          {
            label: "Wind",
            value: `${Math.round(num(c?.wind_speed_10m))} km/h`,
          },
        ],
      };
    }
    case "visibility": {
      const v = visibilityInsight(data, now);
      return {
        ...base,
        headline: v.km !== null ? `${v.km} km` : dash,
        sentence: v.sentence,
        stats: [{ label: "Conditions", value: v.label }],
      };
    }
    case "rain": {
      const r = precipitationInsight(data, now);
      return {
        ...base,
        headline: `${r.next24hMm} mm`,
        sentence: r.sentence,
        stats: [
          { label: "Next 24 h", value: `${r.next24hMm} mm` },
          { label: "Last 24 h", value: `${r.last24hMm} mm` },
          {
            label: "Rain next",
            value: r.nextRainTime ?? r.nextRainDay ?? "None expected",
          },
        ],
      };
    }
    case "humidity": {
      const h = humidityInsight(data);
      return {
        ...base,
        headline: `${h.value}%`,
        sentence: h.sentence,
        stats: [
          { label: "Dew point", value: `${h.dewPoint}°` },
          {
            label: "Air temperature",
            value: deg(data.current?.temperature_2m),
          },
        ],
      };
    }
    case "pressure": {
      const p = pressureInsight(data, now);
      return {
        ...base,
        headline: `${p.hPa} hPa`,
        sentence: p.sentence,
        stats: [
          {
            label: "Trend",
            value: p.trend[0].toUpperCase() + p.trend.slice(1),
          },
        ],
      };
    }
    case "sun": {
      const s = sunInsight(data, now);
      return {
        ...base,
        headline: s.nextEventTime
          ? `${s.nextEventLabel} ${s.nextEventTime}`
          : dash,
        sentence: s.sentence,
        stats: [
          { label: "Sunrise", value: s.sunrise ?? dash },
          { label: "Sunset", value: s.sunset ?? dash },
          { label: "Daylight", value: `${s.daylightHours} h` },
        ],
      };
    }
    case "moon":
      return {
        ...base,
        headline: extras.moonName ?? dash,
        sentence:
          extras.moonName && typeof extras.moonIlluminationPct === "number"
            ? `${extras.moonName}, ${extras.moonIlluminationPct}% lit.${extras.moonrise ? ` Moonrise ${extras.moonrise}.` : ""}`
            : "Moon data unavailable.",
        stats: [
          { label: "Phase", value: extras.moonName ?? dash },
          { label: "Moonrise", value: extras.moonrise ?? dash },
          {
            label: "Lit",
            value:
              typeof extras.moonIlluminationPct === "number"
                ? `${extras.moonIlluminationPct}%`
                : dash,
          },
        ],
      };
    case "averages": {
      const high = extras.todayHigh;
      const normal = extras.normalHigh;
      // The same comparison the tile makes, so the two never disagree: a
      // difference under one degree is "near the average" on both (rounding
      // the raw difference here said "1° below" where the tile said "near").
      const delta = temperatureAverageInsight(high, normal)?.delta ?? null;
      return {
        ...base,
        headline: deg(high),
        sentence:
          delta === null
            ? "No climate average is available for this place yet."
            : delta === 0
              ? "Right at the average daily high."
              : `${Math.abs(delta)}° ${delta > 0 ? "above" : "below"} the average daily high.`,
        stats: [
          { label: "Today's high", value: deg(high) },
          { label: "Normal high", value: deg(normal) },
          {
            label: "Difference",
            value: delta === null ? dash : `${delta > 0 ? "+" : ""}${delta}°`,
          },
        ],
      };
    }
  }
}

/** Compass label helper re-exported so the modal needs one import. */
export { windDirection };

const pad2 = (n: number) => String(n).padStart(2, "0");

/** The wall-clock date (YYYY-MM-DD) and time (HH:MM) of an instant in a place. */
function placeClock(
  ms: number,
  offsetSeconds: number,
): { date: string; time: string } {
  const d = new Date(ms + offsetSeconds * 1000);
  return {
    date: `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`,
    time: `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`,
  };
}

/**
 * A moonrise instant as the place's own clock time, with " tomorrow" when it
 * falls on the next local day. Null in, null out (the moon does not always
 * rise within a day at high latitudes). Never reads the viewer's zone.
 */
export function moonriseLabel(
  riseMs: number | null | undefined,
  nowMs: number,
  offsetSeconds: number,
): string | null {
  if (typeof riseMs !== "number" || !Number.isFinite(riseMs)) return null;
  const rise = placeClock(riseMs, offsetSeconds);
  const today = placeClock(nowMs, offsetSeconds).date;
  return rise.date === today ? rise.time : `${rise.time} tomorrow`;
}

export interface UvDay {
  date: string;
  /** "Today", then the weekday ("Tue"). */
  label: string;
  /** The day's highest UV index, one decimal. */
  peak: number;
  /** WHO category for the peak ("Low" to "Extreme"). */
  category: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/**
 * The forecast days' peak UV, so today reads against the days around it. The
 * weekday comes from the date string itself (a calendar date has one weekday
 * everywhere). A day with no value is left out, never shown as zero.
 */
export function uvForecastDays(daily: DailyWeather | undefined): UvDay[] {
  const times = daily?.time ?? [];
  const out: UvDay[] = [];
  for (let i = 0; i < times.length && i < 7; i++) {
    const peak = daily?.uv_index_max?.[i];
    if (typeof peak !== "number" || !Number.isFinite(peak)) continue;
    const ms = Date.parse(`${times[i].slice(0, 10)}T00:00:00Z`);
    if (!Number.isFinite(ms)) continue;
    out.push({
      date: times[i].slice(0, 10),
      label: i === 0 ? "Today" : WEEKDAYS[new Date(ms).getUTCDay()],
      peak: Math.round(peak * 10) / 10,
      category: uvLevel(peak).label,
    });
  }
  return out;
}
