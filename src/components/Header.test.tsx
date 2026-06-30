/**
 * Header — renders the Seed of Life mark + "mukoko" wordmark, plus
 * optional page title and subtitle. The BrandStripe is intentionally NOT
 * mounted inside the Header (it lives on the root layout as a fixed
 * vertical left-edge accent).
 */

import { render } from '@testing-library/react-native';

import { Header } from '@/components/Header';

type JsonNode = string | { type: string; props: Record<string, unknown>; children: JsonNode[] };

function findImages(node: JsonNode | null): { type: string }[] {
  if (!node || typeof node === 'string') return [];
  const here = node.type === 'Image' ? [{ type: node.type }] : [];
  return [...here, ...(node.children ?? []).flatMap(findImages)];
}

describe('Header', () => {
  it('renders the wordmark "mukoko" in lowercase', async () => {
    const { getByText } = await render(<Header />);
    expect(getByText('mukoko')).toBeTruthy();
  });

  it('renders the Seed of Life mark image', async () => {
    const tree = await render(<Header />);
    const images = findImages(tree.toJSON() as JsonNode | null);
    expect(images.length).toBeGreaterThanOrEqual(1);
  });

  it('renders a page title when supplied', async () => {
    const { getByText } = await render(<Header title="Explore" />);
    expect(getByText('Explore')).toBeTruthy();
    expect(getByText('mukoko')).toBeTruthy();
  });

  it('renders a subtitle when supplied', async () => {
    const { getByText } = await render(<Header subtitle="Harare, ZW" />);
    expect(getByText('Harare, ZW')).toBeTruthy();
  });

  it('honours markOnly by hiding the wordmark', async () => {
    const { queryByText } = await render(<Header markOnly />);
    expect(queryByText('mukoko')).toBeNull();
  });
});
