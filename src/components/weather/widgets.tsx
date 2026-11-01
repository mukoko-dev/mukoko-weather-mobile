/**
 * The visuals inside the insight tiles, drawn with react-native-svg from the
 * web's shapes (mukoko-weather `src/components/weather/widgets/`): wind
 * compass, UV scale, rain bars, pressure dial and sun arc. The geometry is the
 * web's own (src/shared/widget-geometry.ts, with its tests). Colour comes from
 * the page tokens; a data colour (the UV scale) follows the weather convention
 * and carries a ring so it holds 3:1 on any card. Each visual is one image to
 * VoiceOver with a sentence that says what it shows.
 */

import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Line,
  Path,
  Polygon,
  Rect,
  Text as SvgText,
} from "react-native-svg";

import { usePageColors } from "@/hooks/usePageColors";
import { FONT_FILE, SIZE, SPACE, WX_UV, withAlpha } from "@/theme/mzizi";
import { WX_AQI } from "@/theme/weather-scales";
import {
  GRADIENT_BREAKS,
  arcPoint,
  barHeights,
  clampPct,
  compassTicks,
  fractionOf,
  moonTerminatorPath,
  sunArcPath,
  sunArcPoint,
  sunArcSegmentPath,
  trendGlyph,
  windAriaLabel,
} from "@/shared/widget-geometry";

import { WxText } from "./WxText";

/** An SVG that scales to its box: `viewBox` sets the aspect, `maxWidth` the cap. */
export function Scaled({
  viewBox,
  maxWidth,
  label,
  children,
}: {
  viewBox: string;
  maxWidth?: number;
  label: string;
  children: ReactNode;
}) {
  const [, , w, h] = viewBox.split(" ").map(Number);
  return (
    <View
      style={[styles.scaled, { maxWidth, aspectRatio: w / h }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      <Svg width="100%" height="100%" viewBox={viewBox}>
        {children}
      </Svg>
    </View>
  );
}

/**
 * Centred SVG text with a halo in the card colour, so it stays readable over
 * the needle. The halo is drawn first and the text over it (the web's
 * `paint-order: stroke`; SVG itself paints the stroke over the fill).
 */
function HaloText({
  x,
  y,
  fontSize,
  family,
  color,
  halo,
  haloWidth,
  children,
}: {
  x: number;
  y: number;
  fontSize: number;
  family: string;
  color: string;
  halo: string;
  haloWidth: number;
  children: ReactNode;
}) {
  const common = {
    x,
    y,
    textAnchor: "middle",
    fontSize,
    fontFamily: family,
  } as const;
  return (
    <>
      <SvgText {...common} fill={halo} stroke={halo} strokeWidth={haloWidth}>
        {children}
      </SvgText>
      <SvgText {...common} fill={color}>
        {children}
      </SvgText>
    </>
  );
}

// --- wind compass -------------------------------------------------------------

const CENTER = 50;
const RING = 40;

export function CompassDial({
  directionDeg,
  speed,
  gust,
  unit = "km/h",
}: {
  directionDeg: number;
  speed: number;
  gust?: number;
  unit?: string;
}) {
  const { colors } = usePageColors();
  const ticks = compassTicks(CENTER, CENTER, RING, 10, 30);
  const dir = ((directionDeg % 360) + 360) % 360;
  const cardinals = [
    { label: "N", x: CENTER, y: CENTER - RING - 6 },
    { label: "E", x: CENTER + RING + 6, y: CENTER },
    { label: "S", x: CENTER, y: CENTER + RING + 6 },
    { label: "W", x: CENTER - RING - 6, y: CENTER },
  ];
  const sub = gust != null ? `${unit} · gusts ${gust}` : unit;
  return (
    <Scaled
      viewBox="-12 -12 124 124"
      maxWidth={SIZE.dialMax}
      label={windAriaLabel(dir, speed, unit, gust)}
    >
      {ticks.map((t, i) => (
        <Line
          key={i}
          x1={t.x1}
          y1={t.y1}
          x2={t.x2}
          y2={t.y2}
          strokeWidth={t.major ? 1.4 : 0.6}
          stroke={
            t.major ? colors.textSecondary : withAlpha(colors.textTertiary, 0.6)
          }
          strokeLinecap="round"
        />
      ))}
      {cardinals.map((c) => (
        <SvgText
          key={c.label}
          x={c.x}
          y={c.y + 3.5}
          textAnchor="middle"
          fontSize={10}
          fontFamily={FONT_FILE.sans[600]}
          fill={colors.textSecondary}
        >
          {c.label}
        </SvgText>
      ))}
      <G rotation={dir} origin={`${CENTER}, ${CENTER}`}>
        <Line
          x1={CENTER}
          y1={CENTER - RING + 8}
          x2={CENTER}
          y2={CENTER + 8}
          strokeWidth={2.4}
          strokeLinecap="round"
          stroke={colors.primary}
        />
        <Circle
          cx={CENTER}
          cy={CENTER - RING + 8}
          r={2.6}
          fill={colors.primary}
        />
        <Polygon
          points={`${CENTER},${CENTER + 16} ${CENTER - 5},${CENTER + 6} ${CENTER + 5},${CENTER + 6}`}
          fill={colors.primary}
        />
      </G>
      <HaloText
        x={CENTER}
        y={CENTER + 1.5}
        fontSize={13}
        family={FONT_FILE.sans[700]}
        color={colors.textPrimary}
        halo={colors.card}
        haloWidth={3}
      >
        {speed}
      </HaloText>
      <HaloText
        x={CENTER}
        y={CENTER + 10.5}
        fontSize={8.5}
        family={FONT_FILE.sans[400]}
        color={colors.textTertiary}
        halo={colors.card}
        haloWidth={2}
      >
        {sub}
      </HaloText>
    </Scaled>
  );
}

// --- UV scale ----------------------------------------------------------------

/** Hard colour bands edges as a percent of the bar (`GRADIENT_BREAKS.uv`). */
export const UV_BREAK_PCT = GRADIENT_BREAKS.uv ?? [];

/** The two hard-banded scales: the WHO UV index and the US EPA AQI. */
const SCALES = {
  uv: { colors: WX_UV, breaks: GRADIENT_BREAKS.uv ?? [], clip: "uv-clip" },
  aqi: { colors: WX_AQI, breaks: GRADIENT_BREAKS.aqi ?? [], clip: "aqi-clip" },
} as const;

export function GradientScale({
  positionPct,
  label,
  stops = "uv",
}: {
  positionPct: number;
  label: string;
  /** Which scale to draw; the UV index by default. */
  stops?: keyof typeof SCALES;
}) {
  const { colors } = usePageColors();
  const pos = clampPct(positionPct);
  const scale = SCALES[stops];
  return (
    <Scaled
      viewBox="-6 -2 112 16"
      label={`${label}: ${Math.round(pos)}% along the scale`}
    >
      <Defs>
        <ClipPath id={scale.clip}>
          <Rect x={0} y={3} width={100} height={6} rx={3} />
        </ClipPath>
      </Defs>
      <Rect
        x={0}
        y={3}
        width={100}
        height={6}
        rx={3}
        fill={withAlpha(colors.textTertiary, 0.15)}
      />
      <G clipPath={`url(#${scale.clip})`}>
        {scale.colors.map((c, i) => (
          <Rect
            key={c}
            x={scale.breaks[i]}
            y={3}
            width={Math.max(0, scale.breaks[i + 1] - scale.breaks[i])}
            height={6}
            fill={c}
          />
        ))}
      </G>
      <Rect
        x={0}
        y={3}
        width={100}
        height={6}
        rx={3}
        fill="none"
        strokeWidth={0.8}
        stroke={colors.outline}
      />
      <Circle
        cx={pos}
        cy={6}
        r={4.6}
        strokeWidth={1.6}
        fill={colors.card}
        stroke={colors.textPrimary}
      />
    </Scaled>
  );
}

/** The index in large type, its level in words, and the coloured scale. */
export function ScaleReadout({
  value,
  label,
  positionPct,
}: {
  value: string | number;
  label: string;
  positionPct: number;
}) {
  const { colors } = usePageColors();
  return (
    <View style={styles.readout}>
      <WxText
        type="h2"
        weight={700}
        tabular
        leading="none"
        color={colors.textPrimary}
      >
        {value}
      </WxText>
      <WxText type="h6" weight={600} family="serif" color={colors.textPrimary}>
        {label}
      </WxText>
      <GradientScale positionPct={positionPct} label={label} />
    </View>
  );
}

// --- rain bars ---------------------------------------------------------------

const BARS_W = 100;
const BARS_H = 40;

export function MiniBars({
  values,
  label,
  highlightIndex,
}: {
  values: number[];
  label: string;
  highlightIndex?: number;
}) {
  const { colors } = usePageColors();
  const heights = barHeights(values);
  const n = heights.length || 1;
  const slot = BARS_W / n;
  const bar = slot * 0.7;
  return (
    <Scaled
      viewBox={`0 0 ${BARS_W} ${BARS_H}`}
      label={`${label}: ${values.length} values`}
    >
      {heights.map((h, i) => {
        const height = Math.max(1, (h / 100) * BARS_H);
        return (
          <Rect
            key={i}
            x={i * slot + (slot - bar) / 2}
            y={BARS_H - height}
            width={bar}
            height={height}
            rx={1.2}
            fill={colors.primary}
            fillOpacity={i === highlightIndex ? 1 : 0.35}
          />
        );
      })}
    </Scaled>
  );
}

// --- pressure dial -----------------------------------------------------------

const PCX = 60;
const PCY = 60;
const PR = 46;

export function PressureDial({
  hPa,
  trend,
  min = 960,
  max = 1050,
}: {
  hPa: number;
  trend: "rising" | "falling" | "steady";
  min?: number;
  max?: number;
}) {
  const { colors } = usePageColors();
  const f = fractionOf(hPa, min, max);
  const needle = arcPoint(PCX, PCY, PR - 10, f);
  const start = arcPoint(PCX, PCY, PR, 0);
  const end = arcPoint(PCX, PCY, PR, 1);
  const track = `M ${start.x} ${start.y} A ${PR} ${PR} 0 0 1 ${end.x} ${end.y}`;
  const ticks: ReactNode[] = [];
  for (let v = min; v <= max; v += 10) {
    const fr = fractionOf(v, min, max);
    const a = arcPoint(PCX, PCY, PR + 1, fr);
    const b = arcPoint(PCX, PCY, PR - 5, fr);
    ticks.push(
      <Line
        key={v}
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        strokeWidth={1}
        stroke={withAlpha(colors.textTertiary, 0.6)}
      />,
    );
  }
  return (
    <Scaled
      viewBox="0 0 120 96"
      maxWidth={SIZE.dialMax}
      label={`Pressure ${Math.round(hPa)} hPa, ${trend}`}
    >
      <Path
        d={track}
        fill="none"
        strokeWidth={4}
        strokeLinecap="round"
        stroke={withAlpha(colors.textTertiary, 0.2)}
      />
      {ticks}
      <Line
        x1={PCX}
        y1={PCY}
        x2={needle.x}
        y2={needle.y}
        strokeWidth={2.2}
        strokeLinecap="round"
        stroke={colors.primary}
      />
      <Circle cx={PCX} cy={PCY} r={3} fill={colors.primary} />
      <SvgText
        x={12}
        y={79}
        textAnchor="middle"
        fontSize={10}
        fontFamily={FONT_FILE.sans[400]}
        fill={colors.textTertiary}
      >
        {min}
      </SvgText>
      <SvgText
        x={108}
        y={79}
        textAnchor="middle"
        fontSize={10}
        fontFamily={FONT_FILE.sans[400]}
        fill={colors.textTertiary}
      >
        {max}
      </SvgText>
      <SvgText
        x={PCX}
        y={88}
        textAnchor="middle"
        fontSize={13}
        fontFamily={FONT_FILE.sans[700]}
        fill={colors.textPrimary}
      >
        {`${Math.round(hPa)} hPa ${trendGlyph(trend)}`}
      </SvgText>
    </Scaled>
  );
}

// --- sun arc -----------------------------------------------------------------

const SUN_W = 200;
const SUN_H = 80;

export function SunArc({
  arcPct,
  sunrise,
  sunset,
}: {
  arcPct: number | null;
  sunrise: string;
  sunset: string;
}) {
  const { colors } = usePageColors();
  const isNight = arcPct == null;
  const t = isNight ? 1 : clampPct(arcPct) / 100;
  const marker = isNight
    ? { x: SUN_W, y: SUN_H + 8 }
    : sunArcPoint(SUN_W, SUN_H, t);
  const status = isNight
    ? "night"
    : `${Math.round(clampPct(arcPct))}% of daylight travelled`;
  return (
    <Scaled
      viewBox={`-6 0 ${SUN_W + 12} 100`}
      label={`Sun: sunrise ${sunrise}, sunset ${sunset}, ${status}`}
    >
      <Line
        x1={0}
        y1={SUN_H}
        x2={SUN_W}
        y2={SUN_H}
        strokeWidth={1}
        stroke={withAlpha(colors.textTertiary, 0.3)}
      />
      <Path
        d={sunArcPath(SUN_W, SUN_H)}
        fill="none"
        strokeWidth={2}
        strokeDasharray="3 4"
        stroke={withAlpha(colors.textTertiary, 0.4)}
      />
      {!isNight ? (
        <Path
          d={sunArcSegmentPath(SUN_W, SUN_H, t)}
          fill="none"
          strokeWidth={3}
          strokeLinecap="round"
          stroke={colors.sun}
        />
      ) : null}
      <Circle
        cx={marker.x}
        cy={marker.y}
        r={6}
        fill={isNight ? withAlpha(colors.textTertiary, 0.5) : colors.sun}
      />
      <SvgText
        x={0}
        y={SUN_H + 18}
        textAnchor="start"
        fontSize={13}
        fontFamily={FONT_FILE.sans[400]}
        fill={colors.textTertiary}
      >
        {sunrise}
      </SvgText>
      <SvgText
        x={SUN_W}
        y={SUN_H + 18}
        textAnchor="end"
        fontSize={13}
        fontFamily={FONT_FILE.sans[400]}
        fill={colors.textTertiary}
      >
        {sunset}
      </SvgText>
    </Scaled>
  );
}

// --- moon disc ---------------------------------------------------------------

const MOON_R = 40;

/**
 * The moon: a shadowed disc with the lit part drawn from the terminator path
 * (src/shared/widget-geometry.ts). Waxing is lit on the right in the northern
 * hemisphere and on the left in the southern, as the web draws it. A thin ring
 * keeps the disc visible in dark mode, where the shadow is nearly the card.
 */
export function MoonDisc({
  phase,
  illumination,
  southernHemisphere = false,
}: {
  phase: number;
  illumination: number;
  southernHemisphere?: boolean;
}) {
  const { colors } = usePageColors();
  const p = ((phase % 1) + 1) % 1;
  const waxing = p < 0.5;
  const pct = Math.round(Math.max(0, Math.min(1, illumination)) * 100);
  const lit = pct > 0 ? moonTerminatorPath(p, MOON_R) : "";
  return (
    <Scaled
      viewBox="-44 -44 88 88"
      maxWidth={SIZE.moonMax}
      label={`Moon, ${pct}% illuminated, ${waxing ? "waxing" : "waning"}`}
    >
      <Circle r={MOON_R} fill={colors.moonShadow} />
      {lit ? (
        <G scaleX={southernHemisphere ? -1 : 1}>
          <Path d={lit} fill={colors.moonLit} />
        </G>
      ) : null}
      <Circle
        r={MOON_R}
        fill="none"
        strokeWidth={0.8}
        stroke={colors.outline}
      />
    </Scaled>
  );
}

const styles = StyleSheet.create({
  scaled: { width: "100%", alignSelf: "center" },
  readout: { width: "100%", gap: SPACE.snug },
});
