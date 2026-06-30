/**
 * Mirrors mukoko-weather/src/lib/weather-labels.test.ts so we know the
 * mobile + web apps produce identical phrasing.
 */

import {
  cloudLabel,
  feelsLikeContext,
  humidityLabel,
  precipitationLabel,
  pressureLabel,
} from '@/shared/weather-labels';

describe('humidityLabel', () => {
  it.each([
    [10, 'Dry'],
    [30, 'Dry'],
    [45, 'Comfortable'],
    [60, 'Comfortable'],
    [75, 'Humid'],
    [80, 'Humid'],
    [90, 'Very humid'],
    [100, 'Very humid'],
  ])('humidity %i → %s', (h, expected) => {
    expect(humidityLabel(h)).toBe(expected);
  });
});

describe('pressureLabel', () => {
  it('classifies low/normal/high', () => {
    expect(pressureLabel(990)).toBe('Low');
    expect(pressureLabel(1010)).toBe('Normal');
    expect(pressureLabel(1020)).toBe('Normal');
    expect(pressureLabel(1025)).toBe('High');
  });
});

describe('cloudLabel', () => {
  it.each([
    [0, 'Clear'],
    [10, 'Clear'],
    [25, 'Mostly clear'],
    [50, 'Partly cloudy'],
    [80, 'Mostly cloudy'],
    [95, 'Overcast'],
  ])('cloud %i%% → %s', (c, expected) => {
    expect(cloudLabel(c)).toBe(expected);
  });
});

describe('precipitationLabel', () => {
  it('returns None at zero, then Light/Moderate/Heavy', () => {
    expect(precipitationLabel(0)).toBe('None');
    expect(precipitationLabel(1)).toBe('Light');
    expect(precipitationLabel(5)).toBe('Moderate');
    expect(precipitationLabel(20)).toBe('Heavy');
  });
});

describe('feelsLikeContext', () => {
  it('describes apparent vs actual', () => {
    expect(feelsLikeContext(25, 28)).toBe('Cooler than actual');
    expect(feelsLikeContext(32, 28)).toBe('Warmer than actual');
    expect(feelsLikeContext(28, 28)).toBe('Same as actual');
  });
});
