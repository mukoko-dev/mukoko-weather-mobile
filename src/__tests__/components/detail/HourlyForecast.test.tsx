/**
 * HourlyForecast renders a "Now" label for the first cell, temps, and precip
 * percentages, and renders nothing when there are no hours.
 */

import { render } from '@testing-library/react-native';

import { HourlyForecast } from '@/components/detail/HourlyForecast';
import { type HourlyPoint } from '@/components/detail/hourly';

const hours: HourlyPoint[] = [
  { time: '2026-07-02T10:00:00Z', temperature: 18, precipitationProbability: 20, weatherCode: 1, isDay: true },
  { time: '2026-07-02T11:00:00Z', temperature: 20, precipitationProbability: 0, weatherCode: 2, isDay: true },
];

describe('HourlyForecast', () => {
  it('labels the first cell "Now" and shows temps + precip', async () => {
    const { getByText } = await render(<HourlyForecast hours={hours} />);
    expect(getByText('Now')).toBeTruthy();
    expect(getByText('18°')).toBeTruthy();
    expect(getByText('20°')).toBeTruthy();
    expect(getByText('💧 20%')).toBeTruthy();
  });

  it('renders nothing when there are no hours', async () => {
    const { toJSON } = await render(<HourlyForecast hours={[]} />);
    expect(toJSON()).toBeNull();
  });
});
