/**
 * BrandStripe — the canonical 7-mineral VERTICAL band that runs flush
 * against the LEFT edge of the viewport, full height. Each of the seven
 * segments uses `flex: 1` so they are always exactly equal height.
 *
 * Brand doctrine v4.1.0 ring order (top → bottom):
 *   cobalt → tanzanite → malachite → gold → terracotta → sodalite → copper
 *
 * Light vs dark variants are pulled from MINERALS in src/brand/tokens.ts
 * — no hand-picked hex values.
 *
 * Mounted once in `src/app/_layout.tsx` as a fixed left-edge accent.
 */

import { StyleSheet, View, useColorScheme } from 'react-native';

import { MINERALS } from '@/brand/tokens';

export type BrandStripeProps = {
  /** Width of the stripe in dp. Default 3 — matches the web band. */
  width?: number;
};

const ORDER: (keyof typeof MINERALS)[] = [
  'cobalt',
  'tanzanite',
  'malachite',
  'gold',
  'terracotta',
  'sodalite',
  'copper',
];

export function BrandStripe({ width = 3 }: BrandStripeProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return (
    <View
      style={[styles.column, { width }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {ORDER.map((name) => (
        <View
          key={name}
          style={[
            styles.segment,
            { backgroundColor: isDark ? MINERALS[name].dark : MINERALS[name].light },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    width: '100%',
  },
});
