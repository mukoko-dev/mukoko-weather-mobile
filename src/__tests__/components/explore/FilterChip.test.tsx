/**
 * FilterChip render + interaction smoke test.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { FilterChip } from '@/components/explore/FilterChip';

describe('FilterChip', () => {
  it('renders its label and count and fires onPress', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(
      <FilterChip label="Farming" tone="success" count={12} onPress={onPress} />,
    );

    const chip = getByRole('button', { name: 'Farming, 12 locations' });
    expect(chip).toBeTruthy();
    fireEvent.press(chip);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('reflects the selected accessibility state', async () => {
    const { getByRole } = await render(
      <FilterChip label="All" selected onPress={() => {}} />,
    );
    const chip = getByRole('button', { name: 'All' });
    expect(chip.props.accessibilityState).toMatchObject({ selected: true });
  });
});
