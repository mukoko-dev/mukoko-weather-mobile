/**
 * The page sky: the static gradient behind the whole top of the page, chosen
 * by condition family x day/night, with the faint static texture (stars on the
 * night skies, diagonal streaks on rain and storms). It is the page background,
 * so it runs under the status bar, and it scrolls away with the page: below it
 * the ordinary page surface carries every other card at its normal contrast.
 *
 * Mirrors the web's `WeatherSky` + `.kestrel` (mukoko-weather
 * `src/components/weather/WeatherSky.tsx`). No WebGL, no animation: the
 * skeleton and the loaded page paint the SAME sky, so it never jumps.
 * Decorative: hidden from VoiceOver.
 */

import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { usePageColors } from "@/hooks/usePageColors";
import { type SkyFamily, skyTexture } from "@/shared/hero";
import { withAlpha } from "@/theme/mzizi";
import {
  SKY_FG,
  SKY_REACH,
  STARS,
  STARS_OPACITY,
  STREAKS,
  skyReach,
  skyStops,
} from "@/theme/sky";

/** The `d` of the streak lines for a sky `width`: leaning like the web's 105deg. */
export function streakPath(width: number): string {
  const lean = Math.tan(((STREAKS.angleDeg - 90) * Math.PI) / 180);
  const spacing =
    STREAKS.period / Math.cos(((STREAKS.angleDeg - 90) * Math.PI) / 180);
  const run = STREAKS.height * lean;
  const parts: string[] = [];
  for (let x = 0; x <= width + run; x += spacing) {
    const top = Math.round(x * 100) / 100;
    const bottom = Math.round((x - run) * 100) / 100;
    parts.push(`M${top} 0L${bottom} ${STREAKS.height}`);
  }
  return parts.join("");
}

function Stars() {
  return (
    <Svg
      width="100%"
      height="100%"
      style={StyleSheet.absoluteFill}
      opacity={STARS_OPACITY}
    >
      {STARS.map((s) => (
        <Circle
          key={`${s.x}-${s.y}`}
          cx={`${s.x}%`}
          cy={`${s.y}%`}
          r={s.r}
          fill={SKY_FG}
        />
      ))}
    </Svg>
  );
}

function Streaks({ width }: { width: number }) {
  return (
    <Svg
      width={width}
      height={STREAKS.height}
      style={styles.streaks}
      opacity={STREAKS.opacity}
    >
      <Path
        d={streakPath(width)}
        stroke={SKY_FG}
        strokeWidth={STREAKS.width}
        fill="none"
      />
    </Svg>
  );
}

export type WeatherSkyProps = {
  family: SkyFamily;
};

export function WeatherSky({ family }: WeatherSkyProps) {
  const { dark, colors } = usePageColors();
  const { width, height } = useWindowDimensions();
  const stops = skyStops(family, dark);
  const texture = skyTexture(family);
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.box, { height: skyReach(height) }]}
      testID={`weather-sky-${family}`}
    >
      <LinearGradient
        colors={[stops.top, stops.mid, stops.bottom]}
        locations={[0, stops.midAt, 1]}
        style={StyleSheet.absoluteFill}
      />
      {texture === "stars" ? <Stars /> : null}
      {texture === "streaks" ? <Streaks width={width} /> : null}
      <LinearGradient
        colors={[withAlpha(colors.background, 0), colors.background]}
        style={[styles.fade, { height: SKY_REACH.fade }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { position: "absolute", top: 0, left: 0, right: 0, overflow: "hidden" },
  fade: { position: "absolute", left: 0, right: 0, bottom: 0 },
  streaks: { position: "absolute", top: 0, left: 0 },
});
