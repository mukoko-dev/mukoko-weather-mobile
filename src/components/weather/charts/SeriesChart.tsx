/**
 * A small time-series chart drawn with react-native-svg: lines, filled areas
 * and bars on one or two value axes, with a y-axis in words ("28°", "12 mm"),
 * x labels, a legend and one spoken summary. It stands in for the web's
 * `TimeSeriesChart` (Chart.js canvas); the geometry is src/shared/chart-geometry.ts.
 *
 * Accessibility (HIG Charts): the whole chart is ONE image to VoiceOver whose
 * label gives each series' start, end, lowest and highest value, so the data
 * is not locked in the picture. Axis labels are real text, so they follow the
 * person's text size. Colour is never the only signal: a dashed line is dashed,
 * and the legend names every series.
 */

import { useState } from "react";
import { type LayoutChangeEvent, StyleSheet, View } from "react-native";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";

import { usePageColors } from "@/hooks/usePageColors";
import {
  type Axis,
  type Plot,
  areaPaths,
  barRects,
  describeSeries,
  linePaths,
  resolveAxis,
  xTickIndices,
  yAt,
} from "@/shared/chart-geometry";
import { CHART } from "@/theme/chart";
import { RADIUS, SPACE, lineHeightOf, withAlpha } from "@/theme/mzizi";

import { WxText } from "../WxText";

export type ChartSeries = {
  key: string;
  label: string;
  /** For the spoken summary ("km/h"); may be empty. */
  unit: string;
  values: (number | null)[];
  color: string;
  kind?: "line" | "area" | "bar";
  dashed?: boolean;
  axis?: "left" | "right";
  /** Area fill opacity (default 0.18); bar opacity (default 0.7). */
  opacity?: number;
  /** One colour per bar (the UV bands), else `color`. */
  barColors?: string[];
};

export type ChartAxisSpec = {
  min?: number;
  max?: number;
  /** A tick as text: "28°", "12 mm". */
  format: (value: number) => string;
};

export type SeriesChartProps = {
  /** The chart's accessible title ("Wind, next 24 hours"). */
  title: string;
  /** One x label per point ("Now", "15:00"). */
  labels: string[];
  series: ChartSeries[];
  left: ChartAxisSpec;
  right?: ChartAxisSpec;
  height?: number;
  maxXLabels?: number;
  /** Always show the legend (it shows by default for more than one series). */
  legend?: boolean;
  testID?: string;
};

/** A y-axis column: labels at their tick heights, sized by the widest one. */
function AxisLabels({
  axis,
  spec,
  plot,
  color,
  align,
  onWidth,
}: {
  axis: Axis;
  spec: ChartAxisSpec;
  plot: Plot;
  color: string;
  align: "left" | "right";
  onWidth: (width: number) => void;
}) {
  const texts = axis.ticks.map((t) => spec.format(t));
  const widest = texts.reduce((a, b) => (b.length > a.length ? b : a), "");
  return (
    <View
      style={{ height: plot.height }}
      importantForAccessibility="no-hide-descendants"
      onLayout={(e) => onWidth(Math.round(e.nativeEvent.layout.width))}
    >
      {/* Invisible: gives the column the width of its widest label. */}
      <WxText type="caption" color={color} style={styles.sizer}>
        {widest}
      </WxText>
      {axis.ticks.map((t, i) => (
        <WxText
          key={t}
          type="caption"
          tabular
          color={color}
          align={align}
          numberOfLines={1}
          style={[
            styles.tick,
            {
              top: yAt(t, axis, plot) - lineHeightOf("caption") / 2,
              [align === "left" ? "left" : "right"]: 0,
            },
          ]}
        >
          {texts[i]}
        </WxText>
      ))}
    </View>
  );
}

function LegendSwatch({ series }: { series: ChartSeries }) {
  const kind = series.kind ?? "line";
  if (kind === "bar") {
    return (
      <View
        style={[
          styles.barSwatch,
          { backgroundColor: withAlpha(series.color, series.opacity ?? 0.7) },
        ]}
      />
    );
  }
  return (
    <View style={styles.lineSwatch}>
      {series.dashed ? (
        <>
          <View style={[styles.dash, { backgroundColor: series.color }]} />
          <View style={[styles.dash, { backgroundColor: series.color }]} />
        </>
      ) : (
        <View style={[styles.solid, { backgroundColor: series.color }]} />
      )}
    </View>
  );
}

export function SeriesChart({
  title,
  labels,
  series,
  left,
  right,
  height = CHART.height,
  maxXLabels = CHART.maxXLabels,
  legend,
  testID,
}: SeriesChartProps) {
  const { colors } = usePageColors();
  const [width, setWidth] = useState<number>(CHART.defaultWidth);
  // The y-axis columns' widths, so the x labels line up with the plot.
  const [leftWidth, setLeftWidth] = useState(0);
  const [rightWidth, setRightWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0) setWidth((prev) => (prev === w ? prev : w));
  };

  const hasBars = series.some((s) => s.kind === "bar");
  const plot: Plot = { width, height, centered: hasBars };
  const leftAxis = resolveAxis(
    series.filter((s) => (s.axis ?? "left") === "left").flatMap((s) => s.values),
    left,
  );
  const rightAxis =
    right && series.some((s) => s.axis === "right")
      ? resolveAxis(
          series.filter((s) => s.axis === "right").flatMap((s) => s.values),
          right,
        )
      : null;
  const axisOf = (s: ChartSeries) =>
    s.axis === "right" && rightAxis ? rightAxis : leftAxis;

  const xLabels = xTickIndices(labels.length, maxXLabels);
  const showLegend = legend ?? series.length > 1;

  const spoken = describeSeries(
    title,
    series.map((s) => ({ label: s.label, unit: s.unit, values: s.values })),
    labels,
  );

  // Bars under areas under lines, so a line is never hidden.
  const order = (s: ChartSeries) =>
    s.kind === "bar" ? 0 : s.kind === "area" ? 1 : 2;
  const drawn = [...series].sort((a, b) => order(a) - order(b));

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={spoken}
      testID={testID}
      style={styles.root}
    >
      <View style={styles.row}>
        <AxisLabels
          axis={leftAxis}
          spec={left}
          plot={plot}
          color={colors.textTertiary}
          align="right"
          onWidth={setLeftWidth}
        />
        <View style={styles.plot} onLayout={onLayout}>
          <Svg width={width} height={height}>
            {leftAxis.ticks.map((t) => (
              <Line
                key={t}
                x1={0}
                x2={width}
                y1={yAt(t, leftAxis, plot)}
                y2={yAt(t, leftAxis, plot)}
                stroke={colors.border}
                strokeWidth={CHART.grid}
              />
            ))}
            {drawn.map((s) => {
              const axis = axisOf(s);
              const kind = s.kind ?? "line";
              if (kind === "bar") {
                return (
                  <G key={s.key}>
                    {barRects(s.values, axis, plot).map((b) => (
                      <Rect
                        key={b.index}
                        x={b.x}
                        y={b.y}
                        width={b.width}
                        height={b.height}
                        rx={Math.min(2, b.width / 2)}
                        fill={s.barColors?.[b.index] ?? s.color}
                        fillOpacity={s.opacity ?? 0.7}
                      />
                    ))}
                  </G>
                );
              }
              return (
                <G key={s.key}>
                  {kind === "area"
                    ? areaPaths(s.values, axis, plot).map((d) => (
                        <Path
                          key={d}
                          d={d}
                          fill={s.color}
                          fillOpacity={s.opacity ?? 0.18}
                        />
                      ))
                    : null}
                  {linePaths(s.values, axis, plot).map(({ d, dot }) =>
                    dot ? (
                      <Circle
                        key={d}
                        cx={Number(d.split(" ")[1])}
                        cy={Number(d.split(" ")[2])}
                        r={CHART.dot}
                        fill={s.color}
                      />
                    ) : (
                      <Path
                        key={d}
                        d={d}
                        fill="none"
                        stroke={s.color}
                        strokeWidth={CHART.line}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={
                          s.dashed ? `${CHART.dash} ${CHART.dash}` : undefined
                        }
                      />
                    ),
                  )}
                </G>
              );
            })}
          </Svg>
        </View>
        {rightAxis && right ? (
          <AxisLabels
            axis={rightAxis}
            spec={right}
            plot={plot}
            color={colors.textTertiary}
            align="left"
            onWidth={setRightWidth}
          />
        ) : null}
      </View>

      {xLabels.length > 0 ? (
        <View
          style={[
            styles.xRow,
            {
              paddingLeft: leftWidth + (leftWidth > 0 ? SPACE.snug : 0),
              paddingRight: rightWidth + (rightWidth > 0 ? SPACE.snug : 0),
            },
          ]}
          importantForAccessibility="no-hide-descendants"
        >
          {xLabels.map((i) => (
            <WxText
              key={i}
              type="caption"
              tabular
              color={colors.textTertiary}
              numberOfLines={1}
            >
              {labels[i]}
            </WxText>
          ))}
        </View>
      ) : null}

      {showLegend ? (
        <View style={styles.legend} importantForAccessibility="no-hide-descendants">
          {series.map((s) => (
            <View key={s.key} style={styles.legendItem}>
              <LegendSwatch series={s} />
              <WxText type="caption" color={colors.textSecondary}>
                {s.label}
              </WxText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: "100%", gap: SPACE.snug },
  row: { flexDirection: "row", alignItems: "flex-start", gap: SPACE.snug },
  plot: { flex: 1, minWidth: 0 },
  sizer: { opacity: 0 },
  tick: { position: "absolute" },
  xRow: { flexDirection: "row", justifyContent: "space-between" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.stack },
  legendItem: { flexDirection: "row", alignItems: "center", gap: SPACE.tight },
  lineSwatch: {
    width: CHART.swatchWidth,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  solid: { width: CHART.swatchWidth, height: CHART.swatchHeight, borderRadius: RADIUS.pill },
  dash: { width: CHART.swatchWidth / 2 - 2, height: CHART.swatchHeight, borderRadius: RADIUS.pill },
  barSwatch: { width: CHART.swatchHeight * 3, height: CHART.swatchHeight * 3, borderRadius: RADIUS.sm / 2 },
});
