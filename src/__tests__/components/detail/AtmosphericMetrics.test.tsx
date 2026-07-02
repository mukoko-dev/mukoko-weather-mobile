/**
 * AtmosphericMetrics renders the six metric cards with shared labels and the
 * wind-direction supporting line.
 */

import { render } from '@testing-library/react-native';

import type { WeatherResponse } from '@/api/weather';
import { AtmosphericMetrics } from '@/components/detail/AtmosphericMetrics';

const weather = {
  current: {
    temperature: 24,
    feelsLike: 22,
    humidity: 55,
    windSpeed: 12,
    windDirection: 90,
    pressure: 1015,
    cloudCover: 30,
    uvIndex: 6,
    weatherCode: 2,
  },
  daily: [],
} as unknown as WeatherResponse;

describe('AtmosphericMetrics', () => {
  it('renders every metric and a wind-direction hint', async () => {
    const { getByText } = await render(<AtmosphericMetrics weather={weather} />);
    expect(getByText('Humidity')).toBeTruthy();
    expect(getByText('Wind')).toBeTruthy();
    expect(getByText('Pressure')).toBeTruthy();
    expect(getByText('UV index')).toBeTruthy();
    expect(getByText('Cloud')).toBeTruthy();
    expect(getByText('Feels like')).toBeTruthy();
    // windDirection(90) => "E", humidityLabel(55) => "Comfortable"
    expect(getByText('From E')).toBeTruthy();
    expect(getByText('Comfortable')).toBeTruthy();
  });
});
