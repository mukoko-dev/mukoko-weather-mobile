/**
 * Weather from the weather Worker: `GET /v1/weather?lat=&lon=`.
 *
 * The Worker answers in Open-Meteo's shape (snake_case `current`, `hourly` and
 * `daily` as parallel columns, times as the place's own wall clock). The
 * screens use the smaller camelCase model below, so the answer is converted
 * here, at the edge, and nowhere else. A place by slug is read first
 * (`/v1/locations`) to get its coordinate, because `/v1/weather` takes only a
 * point.
 *
 * Only the fields the screens use are converted. `hourly` is kept as the
 * Worker's columns, cut to start at the place's current hour.
 */

import { apiRequest, ROUTES } from "@/api/client";
import { fetchLocation, type LocationSummary } from "@/api/locations";
import { type WeatherData, weatherCodeToInfo } from "@/shared/weather";

export type DailyForecast = {
  /** The place's local calendar date, `YYYY-MM-DD`. */
  date: string;
  tempMax: number | null;
  tempMin: number | null;
  precipitation: number | null;
  precipitationProbability: number | null;
  weatherCode: number | null;
  description?: string;
};

export type CurrentConditions = {
  temperature: number | null;
  feelsLike: number | null;
  humidity: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  pressure: number | null;
  cloudCover: number | null;
  uvIndex: number | null;
  weatherCode: number | null;
  description?: string;
  /** True by day at the place. Absent when the Worker did not say. */
  isDay?: boolean;
  /** The place's local wall-clock time of the reading. */
  observedAt?: string;
};

/** The Worker's hourly columns (`time`, `temperature_2m`, ...), one per hour. */
export type HourlyColumns = Record<string, unknown[]>;

export type WeatherResponse = {
  location?: {
    slug?: string;
    name?: string;
    province?: string;
    country?: string;
    lat: number;
    lon: number;
    elevation?: number;
    source?: string;
    address?: string;
  };
  current: CurrentConditions;
  daily: DailyForecast[];
  hourly?: HourlyColumns;
  /**
   * The whole forecast as the Worker sent it (full hourly and daily columns,
   * the place's UTC offset), for the screens that read "now" in the place's
   * time and compute the tile insights. `hourly` above is the same series cut
   * to start at the current hour.
   */
  forecast?: WeatherData;
  /** The terrain height in metres the forecast used for this exact point. */
  forecastElevation?: number;
  /** Where the forecast came from. `fallback` is a seasonal estimate. */
  source?: "tomorrow" | "open-meteo" | "fallback";
  fetchedAt?: string;
  /** IANA time zone of the place, for example `Africa/Harare`. */
  timezone?: string;
  utcOffsetSeconds?: number;
};

export type WeatherQuery = { slug: string } | { lat: number; lon: number };

/** The Worker's answer. Everything is read defensively. */
type WireWeather = {
  current?: Record<string, unknown>;
  insights?: Record<string, unknown>;
  hourly?: Record<string, unknown>;
  daily?: Record<string, unknown>;
  timezone?: unknown;
  utc_offset_seconds?: unknown;
  elevation?: unknown;
};

/** Where the answer came from, from the `X-Weather-Provider` header. */
export type WeatherMeta = {
  provider?: string | null;
  fetchedAt?: string | null;
};

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function column(block: Record<string, unknown> | undefined, key: string) {
  const v = block?.[key];
  return Array.isArray(v) ? v : [];
}

function describe(code: number | null): string | undefined {
  if (code === null) return undefined;
  const { label } = weatherCodeToInfo(code);
  return label === "Unknown" ? undefined : label;
}

function sourceOf(
  provider: string | null | undefined,
): WeatherResponse["source"] {
  if (!provider) return undefined;
  if (provider.startsWith("open-meteo")) return "open-meteo";
  if (provider.startsWith("tomorrow")) return "tomorrow";
  if (provider === "fallback") return "fallback";
  return undefined;
}

export function toCurrent(
  current: Record<string, unknown> | undefined,
): CurrentConditions {
  const code = num(current?.weather_code);
  const isDay = num(current?.is_day);
  return {
    temperature: num(current?.temperature_2m),
    feelsLike: num(current?.apparent_temperature),
    humidity: num(current?.relative_humidity_2m),
    windSpeed: num(current?.wind_speed_10m),
    windDirection: num(current?.wind_direction_10m),
    pressure: num(current?.surface_pressure),
    cloudCover: num(current?.cloud_cover),
    uvIndex: num(current?.uv_index),
    weatherCode: code,
    description: describe(code),
    isDay: isDay === null ? undefined : isDay === 1,
    observedAt: typeof current?.time === "string" ? current.time : undefined,
  };
}

/** The Worker's parallel daily columns as one row per day. */
export function toDaily(
  daily: Record<string, unknown> | undefined,
): DailyForecast[] {
  const dates = column(daily, "time");
  const max = column(daily, "temperature_2m_max");
  const min = column(daily, "temperature_2m_min");
  const rain = column(daily, "precipitation_sum");
  const chance = column(daily, "precipitation_probability_max");
  const codes = column(daily, "weather_code");
  const rows: DailyForecast[] = [];
  dates.forEach((date, i) => {
    if (typeof date !== "string") return;
    const code = num(codes[i]);
    rows.push({
      date,
      tempMax: num(max[i]),
      tempMin: num(min[i]),
      precipitation: num(rain[i]),
      precipitationProbability: num(chance[i]),
      weatherCode: code,
      description: describe(code),
    });
  });
  return rows;
}

/**
 * The Worker's answer as the shared `WeatherData` model (Open-Meteo's own
 * column names, which the ported web logic reads). Columns that are missing
 * become empty arrays, so every reader gets a series, never `undefined`; a
 * null inside a column stays null and the readers skip it. `undefined` when
 * the answer has no current block or no hours at all.
 */
export function toForecast(raw: WireWeather): WeatherData | undefined {
  if (!raw.current || column(raw.hourly, "time").length === 0) return undefined;
  const hourlyKeys = [
    "time",
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
  ] as const;
  const dailyKeys = [
    "time",
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "apparent_temperature_max",
    "apparent_temperature_min",
    "sunrise",
    "sunset",
    "uv_index_max",
    "precipitation_sum",
    "precipitation_probability_max",
    "wind_speed_10m_max",
    "wind_gusts_10m_max",
  ] as const;
  const hourly = Object.fromEntries(
    hourlyKeys.map((k) => [k, [...column(raw.hourly, k)]]),
  );
  const daily = Object.fromEntries(
    dailyKeys.map((k) => [k, [...column(raw.daily, k)]]),
  );
  const offset = num(raw.utc_offset_seconds);
  const forecast = {
    current: raw.current,
    hourly,
    daily,
    current_units: {},
    insights: raw.insights,
    timezone: typeof raw.timezone === "string" ? raw.timezone : undefined,
    utc_offset_seconds: offset ?? undefined,
  };
  return forecast as unknown as WeatherData;
}

/** Most hours kept; the screens show the next 24. */
const MAX_HOURS = 48;

/**
 * Cut every hourly column to start at the hour of `currentTime`.
 *
 * The Worker's hourly series starts at midnight at the place, so without this
 * the first column would be hours ago, not "now". Times are the place's own
 * wall clock (`2026-11-01T02:45`), so they compare as text and the phone's
 * clock and zone play no part. When every hour is already past, nothing is
 * kept, so a stale series is hidden rather than shown as current.
 */
export function alignHourly(
  hourly: Record<string, unknown> | undefined,
  currentTime: string | undefined,
): HourlyColumns | undefined {
  const times = column(hourly, "time");
  if (!hourly || times.length === 0) return undefined;
  let start = 0;
  if (currentTime) {
    const hour = `${currentTime.slice(0, 13)}:00`;
    start = times.findIndex((t) => typeof t === "string" && t >= hour);
    if (start === -1) return undefined;
  }
  const out: HourlyColumns = {};
  for (const [key, value] of Object.entries(hourly)) {
    if (Array.isArray(value)) out[key] = value.slice(start, start + MAX_HOURS);
  }
  return out;
}

/** Convert the Worker's answer into the model the screens use. */
export function toWeatherResponse(
  raw: WireWeather,
  meta: WeatherMeta = {},
  place?: LocationSummary,
): WeatherResponse {
  const current = toCurrent(raw.current);
  const offset = num(raw.utc_offset_seconds);
  return {
    location: place && {
      slug: place.slug,
      name: place.name,
      province: place.province,
      country: place.country,
      lat: place.lat,
      lon: place.lon,
      elevation: place.elevation,
      source: place.source,
      address: place.address,
    },
    current,
    daily: toDaily(raw.daily),
    hourly: alignHourly(raw.hourly, current.observedAt),
    forecast: toForecast(raw),
    forecastElevation: num(raw.elevation) ?? undefined,
    source: sourceOf(meta.provider),
    fetchedAt: meta.fetchedAt ?? undefined,
    timezone: typeof raw.timezone === "string" ? raw.timezone : undefined,
    utcOffsetSeconds: offset ?? undefined,
  };
}

/**
 * About 110 m. The forecast is gridded far coarser than this, and the
 * Worker caches by a 5 km cell, so a finer fix only reveals where the person
 * is.
 */
function roundCoord(n: number): number {
  return Math.round(n * 1000) / 1000;
}

async function fetchWeatherAt(
  lat: number,
  lon: number,
  signal?: AbortSignal,
  place?: LocationSummary,
): Promise<WeatherResponse> {
  const { data, headers } = await apiRequest<WireWeather>(ROUTES.weather, {
    query: { lat: roundCoord(lat), lon: roundCoord(lon) },
    signal,
  });
  return toWeatherResponse(
    data ?? {},
    {
      provider: headers.get("X-Weather-Provider"),
      fetchedAt: headers.get("X-Fetched-At"),
    },
    place,
  );
}

export async function fetchWeather(
  query: WeatherQuery,
  signal?: AbortSignal,
): Promise<WeatherResponse> {
  if ("slug" in query) {
    const place = await fetchLocation(query.slug, signal);
    return fetchWeatherAt(place.lat, place.lon, signal, place);
  }
  return fetchWeatherAt(query.lat, query.lon, signal);
}
