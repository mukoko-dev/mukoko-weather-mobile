/**
 * Brand kit sanity. The seven minerals (doctrine v4.1.0) must all be present
 * and the spacing scale must match the values consumed by MetricCard / Header.
 */

import { MINERALS, RADIUS, SPACING } from '@/brand/tokens';

describe('brand tokens', () => {
  it('includes all seven minerals', () => {
    expect(Object.keys(MINERALS).sort()).toEqual(
      [
        'cobalt',
        'copper',
        'gold',
        'malachite',
        'sodalite',
        'tanzanite',
        'terracotta',
      ].sort(),
    );
  });

  it('uses the canonical light hex values from doctrine v4.1.0', () => {
    expect(MINERALS.cobalt.light).toBe('#0047AB');
    expect(MINERALS.tanzanite.light).toBe('#4B0082');
    expect(MINERALS.malachite.light).toBe('#004D40');
    expect(MINERALS.gold.light).toBe('#5D4037');
    expect(MINERALS.terracotta.light).toBe('#A0522D');
    expect(MINERALS.sodalite.light).toBe('#283593');
    expect(MINERALS.copper.light).toBe('#BF5A36');
  });

  it('exposes the 4/8/16/24/32/48 spacing scale', () => {
    expect(SPACING).toEqual({ xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 });
  });

  it('keeps RADIUS shorthand pill-y for buttons', () => {
    expect(RADIUS.button).toBe(9999);
    expect(RADIUS.card).toBe(16);
  });
});
