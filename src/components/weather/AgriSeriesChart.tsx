/**
 * A small multi-series chart for the agriculture page: lines, bars and areas
 * over the 16 forecast days (or 46 days of growing degree days), drawn with
 * react-native-svg from the geometry in src/shared/agri-chart.ts.
 *
 * It is the one place the cards draw a series, so replacing it with a shared
 * time-series chart is a change to this file's body and nothing else: the cards
 * hand it rows, series specs and an axis, and it hands back a picture.
 *
 *   - A gap in the data is a gap in the line (never zero).
 *   - The chart is ONE VoiceOver item that reads the title, the span and each
 *     series' lowest and highest value with its day; the drawing is hidden.
 *   - Colour is never the only signal: the legend names each series and shows
 *     its line style (solid, dashed) or bar.
 *   - Axis labels are drawn text of one small size; the title, the note and the
 *     legend are ordinary text and follow the person's text size.
 */

import { useState } from "react";
import { type LayoutChangeEvent, StyleSheet, View } from "react-native";
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";

import { useFarmColors } from "@/hooks/useFarmColors";
import { usePageColors } from "@/hooks/usePageColors";
import {
  type AxisSpec,
  type SeriesSpec,
  chartGeometry,
  describeChart,
  linePath,
} from "@/shared/agri-chart";
import { type AgriChartRow } from "@/shared/agriculture";
import { type FarmColors, FARM_SIZE } from "@/theme/farm";
import { BORDER, FONT_FILE, SPACE, TYPE } from "@/theme/mzizi";

import { WxText } from "./WxText";

/** The palette a series `tone` names. */
export function toneColor(farm: FarmColors, tone: string): string {
  switch (tone) {
    case "rain":
      return farm.series.rain;
    case "terracotta":
      return farm.series.terracotta;
    case "cobalt":
      return farm.series.cobalt;
    case "sodalite":
      return farm.series.sodalite;
    case "gold":
      return farm.series.gold;
    case "earth":
      return farm.series.earth;
    default:
      return farm.malachite;
  }
}

/** Most x labels drawn; more would touch on a narrow phone. */
const MAX_X_LABELS = 5;
/** Room under the plot for the x labels. */
const FOOTER = TYPE.caption.size + SPACE.cozy * 2;

export type AgriSeriesChartProps = {
  title: string;
  rows: AgriChartRow[];
  series: SeriesSpec[];
  axis: AxisSpec;
  testID?: string;
};

function LegendSwatch({ spec, color }: { spec: SeriesSpec; color: string }) {
  const bar = spec.kind === "bar";
  return (
    <Svg
      width={FARM_SIZE.swatchWidth}
      height={FARM_SIZE.legendSwatch}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {bar ? (
        <Rect
          x={0}
          y={0}
          width={FARM_SIZE.swatchWidth}
          height={FARM_SIZE.legendSwatch}
          fill={color}
          fillOpacity={spec.opacity ?? 1}
        />
      ) : (
        <Line
          x1={0}
          x2={FARM_SIZE.swatchWidth}
          y1={FARM_SIZE.legendSwatch / 2}
          y2={FARM_SIZE.legendSwatch / 2}
          stroke={color}
          strokeWidth={FARM_SIZE.chartLine}
          strokeDasharray={spec.dashed ? FARM_SIZE.dash : undefined}
        />
      )}
    </Svg>
  );
}

export function AgriSeriesChart({
  title,
  rows,
  series,
  axis,
  testID,
}: AgriSeriesChartProps) {
  const { colors } = usePageColors();
  const farm = useFarmColors();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(Math.floor(e.nativeEvent.layout.width));
  const plotWidth = Math.max(0, width - FARM_SIZE.chartAxis);
  const geo =
    plotWidth > 0
      ? chartGeometry(rows, series, axis, {
          width: plotWidth,
          height: FARM_SIZE.chartHeight,
          footer: FOOTER,
          barGap: FARM_SIZE.barGap,
          maxXLabels: MAX_X_LABELS,
        })
      : null;
  const label = describeChart(title, rows, series, axis);
  const text = {
    fontFamily: FONT_FILE.sans[400],
    fontSize: TYPE.caption.size,
  } as const;

  return (
    <View testID={testID} style={styles.wrap}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={label}
        onLayout={onLayout}
        style={styles.plot}
      >
        {geo ? (
          <Svg
            width={width}
            height={FARM_SIZE.chartHeight}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {geo.yTicks.map((t) => (
              <G key={t.label + t.y}>
                <Line
                  x1={FARM_SIZE.chartAxis}
                  x2={width}
                  y1={t.y}
                  y2={t.y}
                  stroke={colors.border}
                  strokeWidth={BORDER.rest}
                />
                <SvgText
                  x={FARM_SIZE.chartAxis - SPACE.snug}
                  y={t.y + TYPE.caption.size / 3}
                  textAnchor="end"
                  fill={colors.textTertiary}
                  {...text}
                >
                  {t.label}
                </SvgText>
              </G>
            ))}
            <G x={FARM_SIZE.chartAxis}>
              {geo.series.map(({ spec, runs, bars, areas }) => {
                const color = toneColor(farm, spec.tone);
                return (
                  <G key={spec.key}>
                    {areas.map((d, i) => (
                      <Path key={`a${i}`} d={d} fill={color} fillOpacity={spec.opacity ?? 0.15} />
                    ))}
                    {bars.map((b, i) => (
                      <Rect
                        key={`b${i}`}
                        x={b.x}
                        y={b.y}
                        width={b.width}
                        height={b.height}
                        fill={color}
                        fillOpacity={spec.opacity ?? 1}
                      />
                    ))}
                    {runs.map((run, i) =>
                      run.length === 1 ? (
                        <Circle
                          key={`c${i}`}
                          cx={run[0].x}
                          cy={run[0].y}
                          r={FARM_SIZE.chartLine * 1.5}
                          fill={color}
                        />
                      ) : (
                        <Path
                          key={`l${i}`}
                          d={linePath(run)}
                          stroke={color}
                          strokeWidth={FARM_SIZE.chartLine}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          strokeDasharray={spec.dashed ? FARM_SIZE.dash : undefined}
                          fill="none"
                        />
                      ),
                    )}
                  </G>
                );
              })}
              {geo.xTicks.map((t, i) => {
                const first = i === 0;
                const last = i === geo.xTicks.length - 1 && i > 0;
                return (
                  <SvgText
                    key={t.label + i}
                    x={first ? 0 : last ? plotWidth : t.x}
                    y={FARM_SIZE.chartHeight - SPACE.cozy}
                    textAnchor={first ? "start" : last ? "end" : "middle"}
                    fill={colors.textTertiary}
                    {...text}
                  >
                    {t.label}
                  </SvgText>
                );
              })}
            </G>
          </Svg>
        ) : (
          <View style={styles.reserve} />
        )}
      </View>
      <View
        style={styles.legend}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {series.map((spec) => (
          <View key={spec.key} style={styles.legendItem}>
            <LegendSwatch spec={spec} color={toneColor(farm, spec.tone)} />
            <WxText type="bodySm" color={colors.textSecondary}>
              {spec.label}
            </WxText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACE.snug },
  plot: { width: "100%" },
  reserve: { height: FARM_SIZE.chartHeight },
  legend: { flexDirection: "row", flexWrap: "wrap", columnGap: SPACE.stack, rowGap: SPACE.hair },
  legendItem: { flexDirection: "row", alignItems: "center", gap: SPACE.tight },
});
