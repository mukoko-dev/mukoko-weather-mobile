/**
 * Unit tests for extractHourly — the defensive hourly-forecast reader.
 * Covers both response shapes (normalised array + Open-Meteo columns),
 * upcoming-hour filtering, the all-past fallback, and empty/missing data.
 */

import type { WeatherResponse } from '@/api/weather';
import { extractHourly } from '@/components/detail/hourly';

function baseWeather(extra: Record<string, unknown>): WeatherResponse {
  return {
    current: {
      temperature: 20,
      feelsLike: 19,
      humidity: 50,
      windSpeed: 10,
      windDirection: 90,
      pressure: 1012,
      cloudCover: 20,
      uvIndex: 4,
      weatherCode: 1,
    },
    daily: [],
    ...extra,
  } as unknown as WeatherResponse;
}

const HOUR = 60 * 60 * 1000;

function iso(offsetHours: number): string {
  return new Date(Date.now() + offsetHours * HOUR).toISOString();
}

describe('extractHourly', () => {
  it('returns [] when there is no hourly field', () => {
    expect(extractHourly(baseWeather({}))).toEqual([]);
  });

  it('reads the normalised array shape', () => {
    const weather = baseWeather({
      hourly: [
        { time: iso(1), temperature: 21, precipitationProbability: 30, weatherCode: 2, isDay: 1 },
        { time: iso(2), temperature: 22, precipitationProbability: 10, weatherCode: 1, isDay: 0 },
      ],
    });
    const hours = extractHourly(weather);
    expect(hours).toHaveLength(2);
    expect(hours[0]).toMatchObject({ temperature: 21, precipitationProbability: 30, weatherCode: 2, isDay: true });
    expect(hours[1].isDay).toBe(false);
  });

  it('reads the Open-Meteo column shape', () => {
    const weather = baseWeather({
      hourly: {
        time: [iso(1), iso(2), iso(3)],
        temperature_2m: [15, 16, 17],
        precipitation_probability: [0, 20, 40],
        weather_code: [1, 2, 3],
        is_day: [1, 1, 0],
      },
    });
    const hours = extractHourly(weather);
    expect(hours).toHaveLength(3);
    expect(hours[2]).toMatchObject({ temperature: 17, precipitationProbability: 40, weatherCode: 3, isDay: false });
  });

  it('drops past hours but keeps the in-progress hour', () => {
    const weather = baseWeather({
      hourly: [
        { time: iso(-5), temperature: 10 },
        { time: iso(-0.5), temperature: 11 }, // current hour — kept
        { time: iso(3), temperature: 12 },
      ],
    });
    const hours = extractHourly(weather);
    expect(hours.map((h) => h.temperature)).toEqual([11, 12]);
  });

  it('falls back to the head of the series when every hour is in the past', () => {
    const weather = baseWeather({
      hourly: [
        { time: iso(-10), temperature: 1 },
        { time: iso(-9), temperature: 2 },
      ],
    });
    const hours = extractHourly(weather);
    expect(hours).toHaveLength(2);
    expect(hours[0].temperature).toBe(1);
  });

  it('caps the result at the requested limit', () => {
    const weather = baseWeather({
      hourly: Array.from({ length: 48 }, (_, i) => ({ time: iso(i + 1), temperature: i })),
    });
    expect(extractHourly(weather)).toHaveLength(24);
    expect(extractHourly(weather, 6)).toHaveLength(6);
  });

  it('coerces non-finite / missing numbers to null', () => {
    const weather = baseWeather({
      hourly: [{ time: iso(1), temperature: 'warm', precipitationProbability: null, weatherCode: undefined }],
    });
    const [h] = extractHourly(weather);
    expect(h).toMatchObject({ temperature: null, precipitationProbability: null, weatherCode: null });
  });
});
