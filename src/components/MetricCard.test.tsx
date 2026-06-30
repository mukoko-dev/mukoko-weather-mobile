/**
 * MetricCard — renders label + value + unit + optional icon/supporting line.
 *
 * @testing-library/react-native v14 returns a Promise from `render()`, so every
 * test awaits it.
 */

import { render } from '@testing-library/react-native';

import { MetricCard } from '@/components/MetricCard';

describe('MetricCard', () => {
  it('renders the label, value, and unit', async () => {
    const { getByText } = await render(
      <MetricCard label="Humidity" value={62} unit="%" />,
    );
    expect(getByText('Humidity')).toBeTruthy();
    expect(getByText('62')).toBeTruthy();
    expect(getByText('%')).toBeTruthy();
  });

  it('rounds numeric values', async () => {
    const { getByText } = await render(
      <MetricCard label="Wind" value={12.7} unit="km/h" />,
    );
    expect(getByText('13')).toBeTruthy();
  });

  it('renders an em-dash placeholder for null/undefined/empty values', async () => {
    const { getByText, rerender } = await render(<MetricCard label="UV" value={null} />);
    expect(getByText('—')).toBeTruthy();
    await rerender(<MetricCard label="UV" value={undefined} />);
    expect(getByText('—')).toBeTruthy();
    await rerender(<MetricCard label="UV" value="" />);
    expect(getByText('—')).toBeTruthy();
  });

  it('renders the icon glyph when provided', async () => {
    // The icon is marked `accessible={false}` so screen readers skip it; that
    // also hides it from getByText, so we walk the JSON tree instead.
    const tree = await render(<MetricCard label="Humidity" value={50} icon="💧" />);
    const containsGlyph = JSON.stringify(tree.toJSON()).includes('💧');
    expect(containsGlyph).toBe(true);
  });

  it('renders the supporting line when provided', async () => {
    const { getByText } = await render(
      <MetricCard label="Humidity" value={50} supporting="Comfortable" />,
    );
    expect(getByText('Comfortable')).toBeTruthy();
  });
});
