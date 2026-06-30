/**
 * MukokoLogo — Seed of Life mark + "mukoko" wordmark.
 *
 * Mirrors the web `src/components/brand/MukokoLogo.tsx`. The mark is the
 * official 1024px PNG from mukoko_brand_kit (full-palette light/dark
 * variants). The wordmark is Noto Serif 600, lowercase always.
 */

import { Image, StyleSheet, View, useColorScheme } from 'react-native';

import { BrandText } from '@/components/BrandText';

export type MukokoLogoProps = {
  /** Mark size in dp. Default 32 — matches the web header. */
  size?: number;
  /** Show the "mukoko" wordmark next to the mark. Default true. */
  showWordmark?: boolean;
};

const LIGHT_MARK = require('../../assets/images/mukoko-mark-light.png');
const DARK_MARK = require('../../assets/images/mukoko-mark-dark.png');

export function MukokoLogo({ size = 32, showWordmark = true }: MukokoLogoProps) {
  const scheme = useColorScheme();
  const source = scheme === 'dark' ? DARK_MARK : LIGHT_MARK;
  return (
    <View
      style={styles.row}
      accessibilityRole="image"
      accessibilityLabel="mukoko">
      <Image
        source={source}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      {showWordmark ? (
        <BrandText variant="title" tone="tanzanite" style={styles.wordmark}>
          mukoko
        </BrandText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wordmark: {
    // Lowercase per doctrine — the literal in BrandText is already lowercase.
    // No additional transform so localisation works.
    letterSpacing: -0.3,
  },
});
