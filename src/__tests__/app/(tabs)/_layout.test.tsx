/**
 * Bottom tabs sanity — the layout exports a default React component that
 * registers four screens (Weather, Explore, Shamwari, My) via expo-router's
 * `<Tabs>`. We can't easily snapshot the full navigator without a real
 * NavigationContainer, so we verify the tab icon glyphs render in the
 * correct accent + that the layout module exposes a default export.
 *
 * @testing-library/react-native v14 returns a Promise from `render()`.
 */

import { render } from '@testing-library/react-native';

import TabsLayout from '@/app/(tabs)/_layout';
import { TabIcon } from '@/components/TabIcon';

describe('TabIcon', () => {
  it.each([
    ['weather', '☀'],
    ['explore', '◉'],
    ['shamwari', '✨'],
    ['my', '☸'],
  ] as const)('renders the %s glyph (%s)', async (name, glyph) => {
    const { getByText } = await render(<TabIcon name={name} color="#000" />);
    expect(getByText(glyph)).toBeTruthy();
  });

  it('uses the provided color', async () => {
    const tree = await render(<TabIcon name="weather" color="#0047AB" />);
    const glyph = tree.getByText('☀');
    const styles = Array.isArray(glyph.props.style)
      ? (glyph.props.style as Array<{ color?: string } | undefined>)
      : [glyph.props.style as { color?: string } | undefined];
    const hasColor = styles.some((s) => s?.color === '#0047AB');
    expect(hasColor).toBe(true);
  });
});

describe('bottom tabs layout', () => {
  it('exports a default React component (the Tabs navigator)', () => {
    expect(typeof TabsLayout).toBe('function');
  });
});
