/**
 * BrandStripe — verifies the 7-mineral VERTICAL band on the LEFT.
 *
 * Brand doctrine v4.1.0: the stripe is always vertical, always on the left
 * edge, with seven equal `flex: 1` segments. Order top → bottom:
 *   cobalt → tanzanite → malachite → gold → terracotta → sodalite → copper
 */

import { render } from '@testing-library/react-native';

import { MINERALS } from '@/brand/tokens';
import { BrandStripe } from '@/components/BrandStripe';

type StyleObj = Record<string, unknown>;
type JsonNode = string | { type: string; props: Record<string, unknown>; children: JsonNode[] };

function flatten(style: unknown): StyleObj {
  if (Array.isArray(style)) {
    return style.reduce<StyleObj>((acc, s) => ({ ...acc, ...flatten(s) }), {});
  }
  return (style ?? {}) as StyleObj;
}

function findViews(node: JsonNode | null): { props: { style?: unknown } }[] {
  if (!node || typeof node === 'string') return [];
  const here = node.type === 'View' ? [{ props: node.props as { style?: unknown } }] : [];
  const deeper = (node.children ?? []).flatMap(findViews);
  return [...here, ...deeper];
}

async function viewsOf(element: React.ReactElement) {
  const tree = await render(element);
  const json = tree.toJSON() as JsonNode | null;
  return findViews(json);
}

describe('BrandStripe', () => {
  it('renders exactly 7 equal-flex segments', async () => {
    const all = await viewsOf(<BrandStripe />);
    // 1 column wrapper + 7 segments
    expect(all.length).toBe(8);
    const segments = all.slice(1);
    expect(segments.length).toBe(7);
    for (const seg of segments) {
      const style = flatten(seg.props.style);
      expect(style.flex).toBe(1);
    }
  });

  it('renders the canonical ring order (cobalt → tanzanite → malachite → gold → terracotta → sodalite → copper)', async () => {
    const segments = (await viewsOf(<BrandStripe />)).slice(1);
    const colors = segments.map(
      (s) => (flatten(s.props.style).backgroundColor as string | undefined)?.toUpperCase(),
    );
    expect(colors).toEqual([
      MINERALS.cobalt.light,
      MINERALS.tanzanite.light,
      MINERALS.malachite.light,
      MINERALS.gold.light,
      MINERALS.terracotta.light,
      MINERALS.sodalite.light,
      MINERALS.copper.light,
    ]);
  });

  it('is oriented as a vertical column with 100% height and 3dp default width', async () => {
    const all = await viewsOf(<BrandStripe />);
    const style = flatten(all[0].props.style);
    expect(style.flexDirection).toBe('column');
    expect(style.height).toBe('100%');
    expect(style.width).toBe(3);
  });

  it('honours a custom width', async () => {
    const all = await viewsOf(<BrandStripe width={6} />);
    const style = flatten(all[0].props.style);
    expect(style.width).toBe(6);
  });
});
