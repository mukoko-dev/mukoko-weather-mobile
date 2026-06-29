/**
 * WMO code mapping. Pure function tests — no renderer needed.
 */

import { iconForWmo } from '@/components/WeatherIcon';

describe('iconForWmo', () => {
  it.each([
    [0, true, 'sun'],
    [0, false, 'cloud-sun'],
    [2, true, 'cloud-sun'],
    [3, true, 'cloud'],
    [45, true, 'cloud-fog'],
    [53, true, 'cloud-drizzle'],
    [63, true, 'cloud-rain'],
    [75, true, 'cloud-snow'],
    [81, true, 'cloud-rain'],
    [95, true, 'cloud-lightning'],
  ])('maps code %i (isDay=%s) to %s', (code, isDay, expected) => {
    expect(iconForWmo(code, isDay)).toBe(expected);
  });

  it('defaults to cloud for nullish inputs', () => {
    expect(iconForWmo(null)).toBe('cloud');
    expect(iconForWmo(undefined)).toBe('cloud');
  });
});
