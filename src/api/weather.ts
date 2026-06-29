/**
 * Weather endpoints. The schema mirrors mukoko-weather's Tomorrow.io / Open-Meteo
 * normalisation — see `api/py/_weather.py` in the web app for the canonical shape.
 *
 * We only declare the fields the mobile UI consumes today; new fields can be
 * added without breaking existing screens because we never use `Object.keys` on
 * the response.
 */

import { apiFetch } from '@/api/client';

export type DailyForecast = {
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
  observedAt?: string;
};

export type WeatherResponse = {
  location?: {
    slug?: string;
    name?: string;
    province?: string;
    country?: string;
    lat: number;
    lon: number;
  };
  current: CurrentConditions;
  daily: DailyForecast[];
  source?: 'tomorrow' | 'open-meteo' | 'fallback';
  fetchedAt?: string;
};

export type WeatherQuery =
  | { slug: string }
  | { lat: number; lon: number };

export function fetchWeather(
  query: WeatherQuery,
  signal?: AbortSignal,
): Promise<WeatherResponse> {
  return apiFetch<WeatherResponse>('/api/py/weather', {
    query:
      'slug' in query
        ? { location: query.slug }
        : { lat: query.lat, lon: query.lon },
    signal,
  });
}
