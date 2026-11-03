/**
 * MukokoLogo — the Seed of Life mark + the "weather" wordmark.
 *
 * Mirrors the web `src/components/brand/MukokoLogo.tsx`: the 7-mineral mark
 * (the official PNG from mukoko_brand_kit, light/dark variants) beside the
 * word "weather" in the heading face, lowercase, spoken as "mukoko weather".
 *
 * `onSky` draws it on the weather sky (the home hero's top row, where a place
 * page has Back): the bright (dark-theme) mark and the sky foreground, which
 * reads on every sky family in light and dark.
 */

import { Image, StyleSheet, View, useColorScheme } from "react-native";

import { WxText } from "@/components/weather/WxText";
import { pageColorsFor, SPACE } from "@/theme/mzizi";
import { SKY_FG } from "@/theme/sky";

export type MukokoLogoProps = {
  /** Mark size in dp. Default 32 — matches the web header. */
  size?: number;
  /** Show the "weather" wordmark next to the mark. Default true. */
  showWordmark?: boolean;
  /** Drawn on the weather sky rather than on the page surface. */
  onSky?: boolean;
  testID?: string;
};

const LIGHT_MARK = require("../../assets/images/mukoko-mark-light.png");
const DARK_MARK = require("../../assets/images/mukoko-mark-dark.png");

/** What a screen reader says for the logo. */
export const LOGO_LABEL = "mukoko weather";

export function MukokoLogo({
  size = 32,
  showWordmark = true,
  onSky = false,
  testID,
}: MukokoLogoProps) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const source = onSky || scheme === "dark" ? DARK_MARK : LIGHT_MARK;
  const color = onSky ? SKY_FG : pageColorsFor(scheme).textPrimary;
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="image"
      accessibilityLabel={LOGO_LABEL}
      testID={testID}
    >
      <Image
        source={source}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      {/* The wordmark is a brand mark, not body text: it never grows with
          Dynamic Type (issue #78), so it cannot run under the controls
          beside it. */}
      {showWordmark ? (
        <WxText
          type="h5"
          weight={700}
          family="serif"
          color={color}
          allowFontScaling={false}
        >
          weather
        </WxText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.snug,
  },
});
