/**
 * hourly — parallel-array extraction, daytime detection, hour labelling.
 */

import { type WeatherResponse } from '@/api/weather';
import { extractHourly, hourLabel, isDaytime } from '@/components/home/hourly';

function makeWeather(hourly: unknown): WeatherResponse {
  return { hourly, current: {}, daily: [] } as unknown as WeatherResponse;
}

describe('extractHourly', () => {
  it('zips the parallel arrays into points', () => {
    const w = makeWeather({
      time: ['2026-06-30T10:00', '2026-06-30T11:00'],
      temperature_2m: [21.4, 22.9],
      weather_code: [0, 3],
      precipitation_probability: [0, 40],
    });
    const points = extractHourly(w);
    expect(points).toHaveLength(2);
    expect(points[0]).toEqual({
      time: '2026-06-30T10:00',
      temp: 21.4,
      weatherCode: 0,
      precipProb: 0,
    });
    expect(points[1].precipProb).toBe(40);
  });

  it('caps the result at maxHours', () => {
    const time = Array.from({ length: 48 }, (_, i) => `2026-06-30T${i}:00`);
    const w = makeWeather({ time, temperature_2m: [], weather_code: [] });
    expect(extractHourly(w, 24)).toHaveLength(24);
  });

  it('yields null metrics when arrays are missing and skips empty timestamps', () => {
    const w = makeWeather({ time: ['2026-06-30T10:00', ''] });
    const points = extractHourly(w);
    expect(points).toHaveLength(1);
    expect(points[0].temp).toBeNull();
    expect(points[0].weatherCode).toBeNull();
    expect(points[0].precipProb).toBeNull();
  });

  it('returns an empty array when there is no hourly block', () => {
    expect(extractHourly(makeWeather(undefined))).toEqual([]);
  });
});

describe('isDaytime', () => {
  it('treats 06:00–18:59 as day', () => {
    expect(isDaytime(new Date(2026, 5, 30, 6, 0))).toBe(true);
    expect(isDaytime(new Date(2026, 5, 30, 18, 30))).toBe(true);
    expect(isDaytime(new Date(2026, 5, 30, 5, 59))).toBe(false);
    expect(isDaytime(new Date(2026, 5, 30, 19, 0))).toBe(false);
  });
});

describe('hourLabel', () => {
  it('labels the first hour as "Now"', () => {
    expect(hourLabel('2026-06-30T10:00', 0)).toBe('Now');
  });

  it('formats later hours from the timestamp', () => {
    expect(hourLabel('2026-06-30T10:00', 3)).toMatch(/\d/);
  });

  it('falls back to the raw string for an unparseable timestamp', () => {
    expect(hourLabel('not-a-date', 2)).toBe('not-a-date');
  });
});
