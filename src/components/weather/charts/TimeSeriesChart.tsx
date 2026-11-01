/**
 * The one reusable time-series chart, drawn with react-native-svg. It mirrors
 * the web's `TimeSeriesChart` contract (mukoko-weather
 * `src/components/weather/charts/TimeSeriesChart.tsx`): data points with a
 * label field, a list of series (line, filled area, dashed line or bars, each
 * on its own y axis), optional axis ranges and formats, and a cap on x labels.
 * Every chart in the app is a thin config of this, as on the web.
 *
 * What a phone adds:
 *
 *   - Touch: tap a point, or drag a finger along the chart, and the readout row
 *     above the plot shows that point's values with a rule and dots on the
 *     plot. The readout is above the plot (not a floating box) so a finger
 *     never covers it. With nothing selected the same row is the legend, with
 *     a different swatch for a solid line, a dashed line and bars, so colour is
 *     never the only signal.
 *   - VoiceOver / TalkBack: the chart is ONE element. Its name is the title and
 *     a sentence per series (lowest and highest value and when); it is
 *     "adjustable", so swiping up or down steps through the points and speaks
 *     each one's values. Nothing is lost by not seeing it.
 *   - Text size: axis labels follow the person's text size (capped, so the plot
 *     keeps room), and the readout is ordinary scaling text.
 *   - Reduce Motion: the only motion is a short fade when the chart first
 *     appears; it is skipped when Reduce Motion is on. Selecting is direct
 *     manipulation and never animates.
 *   - A reading the forecast does not have is a gap in the line, never a zero.
 *
 * Series colours are weather-convention colours (src/theme/wx-series.ts), never
 * brand minerals. A series' `color` is a `SeriesKey` or a literal hex.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from "react-native-svg";

import { usePageColors } from "@/hooks/usePageColors";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import {
  BORDER,
  FONT_FILE,
  SPACE,
  TYPE,
  lineHeightOf,
  withAlpha,
} from "@/theme/mzizi";
import { type SeriesKey, seriesColors } from "@/theme/wx-series";

import { WxText } from "../WxText";
import { type AxisConfig, type Reading, nearestIndex } from "./chart-layout";
import { DEFAULT_AXIS, type SeriesSpec, buildChartModel } from "./chart-model";
import {
  type ValueFormat,
  type TextSeries,
  defaultValueFormat,
  describeChart,
  pointText,
  readingText,
} from "./chart-text";

export interface SeriesConfig {
  key: string;
  label: string;
  /** A `SeriesKey` from src/theme/wx-series.ts, or a literal hex. */
  color: SeriesKey | string;
  type?: "line" | "bar";
  fill?: boolean;
  dashed?: boolean;
  yAxisID?: string;
  /** Lower draws on top. */
  order?: number;
  opacity?: number;
  showDots?: boolean;
  /**
   * Bars only: colour each bar from its own value (a hex from a published
   * scale, such as the WHO UV bands) instead of one series colour.
   */
  colorByValue?: (value: number | null) => string;
}

export interface TimeSeriesChartProps {
  /** The chart's accessible name, for example "Temperature, next 24 hours". */
  title: string;
  /** One object per point: the label field and a number (or null) per series key. */
  data: readonly object[];
  /** Which field of a point is its x label. */
  labelKey: string;
  series: SeriesConfig[];
  /** Y axes keyed by `yAxisID`; a series with none is on `y`. */
  yAxes?: Record<string, AxisConfig>;
  /**
   * One value with its unit: `("Temperature", 21)` is "21°C". Used for the
   * readout and for what VoiceOver says.
   */
  valueFormat?: ValueFormat;
  /** Web contract: replaces the readout text of one series ("Temperature: 21°C"). */
  tooltipLabel?: (seriesLabel: string, value: number) => string;
  /** Web contract: replaces the readout's title (the point's label). */
  tooltipTitle?: (label: string) => string;
  /** Web contract: the text of an x label. */
  xTickFormat?: (label: string, index: number) => string;
  /** Most x labels drawn (fewer when they would touch). Default 8. */
  maxTicksLimit?: number;
  /** Plot width over height. The web's `aspect-[2/1]` is 2. Default 2. */
  aspect?: number;
  showDots?: boolean;
  testID?: string;
}

/** Line, dot and bar sizes, from the web's Chart.js config. */
export const CHART = {
  line: 2,
  dashedLine: 1.5,
  dash: [4, 3],
  dot: 2,
  selectedDot: 4,
  barRadius: 2,
  lineFillOpacity: 0.12,
  barOpacity: 0.6,
  gridOpacity: 0.15,
  /** The largest text-size multiplier the axis labels follow. */
  maxFontScale: 1.5,
  fadeMs: 200,
} as const;

/** The most the readout row reserves, in lines, so selecting never moves the chart. */
const READOUT_LINES = 2;

function fieldOf(point: object, key: string): unknown {
  return (point as Record<string, unknown>)[key];
}

function numberOf(v: unknown): Reading {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function LegendSwatch({
  spec,
  color,
}: {
  spec: Pick<SeriesSpec, "kind" | "dashed">;
  color: string;
}) {
  return (
    <Svg width={16} height={10} accessibilityElementsHidden>
      {spec.kind === "bar" ? (
        <Rect x={3} y={1} width={10} height={8} rx={CHART.barRadius} fill={color} />
      ) : (
        <Line
          x1={0}
          y1={5}
          x2={16}
          y2={5}
          stroke={color}
          strokeWidth={spec.dashed ? CHART.dashedLine : CHART.line}
          strokeDasharray={spec.dashed ? CHART.dash.join(" ") : undefined}
        />
      )}
    </Svg>
  );
}

export function TimeSeriesChart({
  title,
  data,
  labelKey,
  series,
  yAxes,
  valueFormat = defaultValueFormat,
  tooltipLabel,
  tooltipTitle,
  xTickFormat,
  maxTicksLimit = 8,
  aspect = 2,
  showDots = false,
  testID = "time-series-chart",
}: TimeSeriesChartProps) {
  const { colors, dark } = usePageColors();
  const { fontScale } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const palette = seriesColors(dark);
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [fade] = useState(() => new Animated.Value(0));
  const touch = useRef({ x: 0, y: 0, scrubbing: false });

  const fontSize = TYPE.caption.size * Math.min(fontScale, CHART.maxFontScale);
  const labels = useMemo(
    () => data.map((d) => String(fieldOf(d, labelKey) ?? "")),
    [data, labelKey],
  );
  const specs: SeriesSpec[] = useMemo(
    () =>
      series.map((s) => ({
        key: s.key,
        label: s.label,
        kind: s.type === "bar" ? "bar" : "line",
        fill: s.fill ?? false,
        dashed: s.dashed ?? false,
        axisId: s.yAxisID ?? DEFAULT_AXIS,
        order: s.order ?? (s.type === "bar" ? 2 : 1),
        showDots: s.showDots ?? showDots,
        values: data.map((d) => numberOf(fieldOf(d, s.key))),
      })),
    [data, series, showDots],
  );
  const textSeries: TextSeries[] = useMemo(
    () => specs.map((s) => ({ label: s.label, values: s.values })),
    [specs],
  );
  const height = width > 0 ? width / aspect : 0;
  const model = useMemo(
    () =>
      buildChartModel({
        width,
        height,
        labels,
        series: specs,
        axes: yAxes,
        fontSize,
        maxTicksLimit,
        xTickFormat,
      }),
    [width, height, labels, specs, yAxes, fontSize, maxTicksLimit, xTickFormat],
  );

  useEffect(() => {
    if (reduceMotion) {
      fade.setValue(1);
      return;
    }
    fade.setValue(0);
    const run = Animated.timing(fade, {
      toValue: 1,
      duration: CHART.fadeMs,
      useNativeDriver: true,
    });
    run.start();
    return () => run.stop();
  }, [fade, reduceMotion]);

  const usable = data.length >= 2;
  const hasData = usable && specs.some((s) => s.values.some((v) => v !== null));
  const index = selected !== null && selected < data.length ? selected : null;
  const summary = hasData ? describeChart(textSeries, labels, valueFormat) : "";

  const colorOf = (s: SeriesConfig) =>
    (palette as Record<string, string>)[s.color] ?? s.color;

  const readingFor = (i: number, k: number) =>
    tooltipLabel && typeof specs[k].values[i] === "number"
      ? tooltipLabel(specs[k].label, specs[k].values[i] as number)
      : readingText(textSeries[k], i, valueFormat);

  const select = (x: number) => {
    const i = nearestIndex(x, model.xs);
    if (i >= 0) setSelected(i);
  };

  const onTouchStart = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    touch.current = { x: locationX, y: locationY, scrubbing: false };
  };
  const onTouchMove = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    const t = touch.current;
    const dx = Math.abs(locationX - t.x);
    const dy = Math.abs(locationY - t.y);
    if (!t.scrubbing && dx > SPACE.tight && dx > dy) t.scrubbing = true;
    if (t.scrubbing) select(locationX);
  };
  const onTouchEnd = (e: GestureResponderEvent) => {
    const t = touch.current;
    if (t.scrubbing) return;
    const { locationX, locationY } = e.nativeEvent;
    if (Math.abs(locationX - t.x) > SPACE.snug || Math.abs(locationY - t.y) > SPACE.snug) return;
    const i = nearestIndex(locationX, model.xs);
    // Touching the selected point again clears it.
    setSelected((cur) => (i < 0 || i === cur ? null : i));
  };

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    const last = data.length - 1;
    if (e.nativeEvent.actionName === "increment") {
      setSelected((cur) => Math.min(last, (cur ?? -1) + 1));
    } else if (e.nativeEvent.actionName === "decrement") {
      setSelected((cur) => Math.max(0, (cur ?? 1) - 1));
    }
  };

  if (!hasData) {
    return (
      <View testID={`${testID}-empty`} accessible accessibilityLabel={`${title}. Not enough forecast hours to draw this chart.`}>
        <WxText type="body" color={colors.textTertiary}>
          Not enough forecast hours to draw this chart.
        </WxText>
      </View>
    );
  }

  const readoutTitle =
    index !== null
      ? tooltipTitle
        ? tooltipTitle(labels[index])
        : labels[index]
      : null;

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`${title}. ${summary}`}
      accessibilityHint="Swipe up or down to hear each value."
      accessibilityValue={
        index !== null ? { text: pointText(textSeries, labels, index, valueFormat) } : undefined
      }
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={onAccessibilityAction}
      style={styles.chart}
    >
      <View style={styles.readout} testID={`${testID}-readout`}>
        {index !== null ? (
          <>
            <WxText type="bodySm" weight={600} tabular color={colors.textPrimary}>
              {readoutTitle ?? ""}
            </WxText>
            {series.map((s, k) => (
              <View key={s.key} style={styles.item}>
                <LegendSwatch spec={specs[k]} color={colorOf(s)} />
                <WxText type="bodySm" tabular color={colors.textSecondary}>
                  {readingFor(index, k)}
                </WxText>
              </View>
            ))}
          </>
        ) : (
          series.map((s, k) => (
            <View key={s.key} style={styles.item}>
              <LegendSwatch spec={specs[k]} color={colorOf(s)} />
              <WxText type="bodySm" color={colors.textSecondary}>
                {s.label}
              </WxText>
            </View>
          ))
        )}
      </View>

      <Animated.View
        style={[{ aspectRatio: aspect, opacity: fade }]}
        onLayout={(e) => setWidth(Math.floor(e.nativeEvent.layout.width))}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        testID={`${testID}-plot`}
      >
        {width > 0 ? (
          <Svg width={width} height={height} pointerEvents="none">
            {model.gridY.map((y) => (
              <Line
                key={`g${y}`}
                x1={model.plot.left}
                x2={model.plot.left + model.plot.width}
                y1={y}
                y2={y}
                stroke={withAlpha(colors.textTertiary, CHART.gridOpacity)}
                strokeWidth={BORDER.rest}
              />
            ))}
            {model.leftTicks.map((t) => (
              <SvgText
                key={`l${t.value}`}
                x={model.plot.left - SPACE.snug}
                y={t.y + fontSize * 0.35}
                textAnchor="end"
                fontSize={fontSize}
                fontFamily={FONT_FILE.sans[400]}
                fill={colors.textTertiary}
              >
                {t.text}
              </SvgText>
            ))}
            {model.rightTicks.map((t) => (
              <SvgText
                key={`r${t.value}`}
                x={model.plot.left + model.plot.width + SPACE.snug}
                y={t.y + fontSize * 0.35}
                textAnchor="start"
                fontSize={fontSize}
                fontFamily={FONT_FILE.sans[400]}
                fill={colors.textTertiary}
              >
                {t.text}
              </SvgText>
            ))}
            {model.xLabels.map((l) => (
              <SvgText
                key={`x${l.index}`}
                x={l.x}
                y={model.plot.top + model.plot.height + fontSize + SPACE.hair}
                textAnchor={
                  l.index === 0 ? "start" : l.index === labels.length - 1 ? "end" : "middle"
                }
                fontSize={fontSize}
                fontFamily={FONT_FILE.sans[400]}
                fill={colors.textTertiary}
              >
                {l.text}
              </SvgText>
            ))}

            {model.series.map((drawn) => {
              const cfg = series.find((s) => s.key === drawn.spec.key) as SeriesConfig;
              const color = colorOf(cfg);
              return (
                <G key={drawn.spec.key}>
                  {drawn.areas.map((d, n) => (
                    <Path
                      key={`a${n}`}
                      d={d}
                      fill={color}
                      fillOpacity={cfg.opacity ?? CHART.lineFillOpacity}
                    />
                  ))}
                  {drawn.bars.map((b) => (
                    <Rect
                      key={`b${b.index}`}
                      x={b.x}
                      y={b.y}
                      width={b.width}
                      height={b.height}
                      rx={CHART.barRadius}
                      fill={
                        cfg.colorByValue
                          ? cfg.colorByValue(drawn.spec.values[b.index])
                          : color
                      }
                      fillOpacity={cfg.opacity ?? CHART.barOpacity}
                    />
                  ))}
                  {drawn.lines.map((d, n) => (
                    <Path
                      key={`p${n}`}
                      d={d}
                      fill="none"
                      stroke={color}
                      strokeWidth={drawn.spec.dashed ? CHART.dashedLine : CHART.line}
                      strokeDasharray={drawn.spec.dashed ? CHART.dash.join(" ") : undefined}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                  {drawn.dots.map((p) => (
                    <Circle key={`d${p.x}`} cx={p.x} cy={p.y} r={CHART.dot} fill={color} />
                  ))}
                </G>
              );
            })}

            {index !== null ? (
              <>
                <Line
                  x1={model.xs[index]}
                  x2={model.xs[index]}
                  y1={model.plot.top}
                  y2={model.plot.top + model.plot.height}
                  stroke={withAlpha(colors.textTertiary, 0.6)}
                  strokeWidth={BORDER.active}
                />
                {model.series.map((drawn) => {
                  const p = drawn.points[index];
                  if (!p || drawn.spec.kind === "bar") return null;
                  const cfg = series.find((s) => s.key === drawn.spec.key) as SeriesConfig;
                  return (
                    <Circle
                      key={`s${drawn.spec.key}`}
                      cx={p.x}
                      cy={p.y}
                      r={CHART.selectedDot}
                      fill={colorOf(cfg)}
                      stroke={colors.card}
                      strokeWidth={BORDER.active * 2}
                    />
                  );
                })}
              </>
            ) : null}
          </Svg>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { gap: SPACE.snug },
  readout: {
    minHeight: lineHeightOf("bodySm") * READOUT_LINES,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: SPACE.stack,
    rowGap: SPACE.hair,
  },
  item: { flexDirection: "row", alignItems: "center", gap: SPACE.hair },
});
