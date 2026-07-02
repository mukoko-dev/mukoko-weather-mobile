/**
 * Renders HeroConditions and checks the temperature, condition, feels-like
 * context line, and today's high/low all appear.
 */

import { render } from '@testing-library/react-native';

import type { WeatherResponse } from '@/api/weather';
import { HeroConditions } from '@/components/detail/HeroConditions';

const weather = {
  location: { name: 'Harare', country: 'ZW', lat: -17.8, lon: 31.0 },
  current: {
    temperature: 24.4,
    feelsLike: 22.1,
    humidity: 55,
    windSpeed: 12,
    windDirection: 180,
    pressure: 1015,
    cloudCover: 30,
    uvIndex: 6,
    weatherCode: 2,
    description: 'Partly cloudy',
  },
  daily: [{ date: '2026-07-02', tempMax: 26, tempMin: 9, precipitation: 0, precipitationProbability: 5, weatherCode: 2 }],
} as unknown as WeatherResponse;

describe('HeroConditions', () => {
  it('renders temperature, condition, feels-like and high/low', async () => {
    const { getByText } = await render(<HeroConditions weather={weather} />);
    expect(getByText('24°')).toBeTruthy();
    expect(getByText('Partly cloudy')).toBeTruthy();
    expect(getByText(/feels like 22°/)).toBeTruthy();
    expect(getByText(/Cooler than actual/)).toBeTruthy();
    expect(getByText('H 26°')).toBeTruthy();
    expect(getByText('L 9°')).toBeTruthy();
  });

  it('shows an em-dash when the temperature is missing', async () => {
    const missing = { ...weather, current: { ...weather.current, temperature: null } } as unknown as WeatherResponse;
    const { getByText } = await render(<HeroConditions weather={missing} />);
    expect(getByText('—')).toBeTruthy();
  });
});
