/**
 * LocationCard render smoke test — name, subtitle, and tag badges render; the
 * row is exposed as a link. @testing-library/react-native v14 render() is async.
 */

import { render } from '@testing-library/react-native';

import { LocationCard } from '@/components/explore/LocationCard';

describe('LocationCard', () => {
  it('renders the name, "province · country" subtitle and tag badges', async () => {
    const { getByText } = await render(
      <LocationCard
        location={{
          slug: 'harare',
          name: 'Harare',
          province: 'Harare',
          country: 'ZW',
          tags: ['city', 'education'],
        }}
      />,
    );

    expect(getByText('Harare')).toBeTruthy();
    expect(getByText('Harare · ZW')).toBeTruthy();
    expect(getByText('City')).toBeTruthy();
    expect(getByText('Education')).toBeTruthy();
  });

  it('exposes a link role for navigation', async () => {
    const { getByRole } = await render(
      <LocationCard location={{ slug: 'kwekwe', name: 'Kwekwe' }} />,
    );
    expect(getByRole('link', { name: 'Open weather for Kwekwe' })).toBeTruthy();
  });
});
