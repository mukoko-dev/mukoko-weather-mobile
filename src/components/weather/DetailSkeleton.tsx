/**
 * The loading state of a detail page: the same top row (a live Back control),
 * the same title rows and two cards with a chart-shaped block, on the same
 * sky, so nothing moves when the charts arrive (Apple's launching guidance: a
 * structural copy of the first screen, no splash and no spinner). VoiceOver
 * hears one busy "Loading forecast" item, never the bars. Under Reduce Motion
 * the bars are still.
 */

import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { usePageColors } from "@/hooks/usePageColors";
import {
  BORDER,
  RADIUS,
  SPACE,
  TYPE,
  withAlpha,
} from "@/theme/mzizi";
import { NEUTRAL_SKY, SKY_FG } from "@/theme/sky";

import { Bar, ShimmerProvider } from "./Shimmer";
import { TextBar, TopRowSkeleton } from "./WeatherSkeleton";
import { WeatherScroll } from "./WeatherScroll";

/** Typical bar widths, in dp. */
const WIDTH = { title: 220, subtitle: 160, heading: 140, label: 96 } as const;

/** The plot's width over height, as the charts use. */
const CHART_ASPECT = 2;

function CardSkeleton({ charts }: { charts: number }) {
  const { colors } = usePageColors();
  const bar = withAlpha(colors.textTertiary, 0.18);
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Bar color={bar} width={WIDTH.heading} height={Math.round(TYPE.h6.size * 0.7)} />
      {Array.from({ length: charts }, (_, i) => (
        <View key={i} style={styles.chart}>
          <Bar color={bar} width={WIDTH.label} height={Math.round(TYPE.bodySm.size * 0.7)} />
          <Bar color={bar} width="100%" height={0} style={styles.plot} />
        </View>
      ))}
    </View>
  );
}

export type DetailSkeletonProps = {
  /** A real control at the left of the top row (Back), live while loading. */
  leading?: ReactNode;
  /** What is loading, for VoiceOver: "forecast" or "atmosphere". */
  what: string;
  /** How many cards to draw (2 on /forecast, 1 on /atmosphere). */
  cards?: number;
};

export function DetailSkeleton({ leading, what, cards = 2 }: DetailSkeletonProps) {
  const bar = withAlpha(SKY_FG, 0.18);
  return (
    <WeatherScroll family={NEUTRAL_SKY}>
      <ShimmerProvider>
        <View testID="detail-skeleton">
          <TopRowSkeleton leading={leading} />
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`Loading ${what}`}
            accessibilityState={{ busy: true }}
            style={styles.page}
          >
            <View style={styles.title}>
              <TextBar type="h3" width={WIDTH.title} color={bar} align="flex-start" />
              <TextBar type="body" width={WIDTH.subtitle} color={bar} align="flex-start" />
            </View>
            {Array.from({ length: cards }, (_, i) => (
              <CardSkeleton key={i} charts={1} />
            ))}
          </View>
        </View>
      </ShimmerProvider>
    </WeatherScroll>
  );
}

const styles = StyleSheet.create({
  page: { gap: SPACE.section },
  title: { gap: SPACE.hair, paddingTop: SPACE.heroTop },
  card: {
    borderRadius: RADIUS.card,
    borderWidth: BORDER.rest,
    padding: SPACE.card,
    gap: SPACE.stack,
  },
  chart: { gap: SPACE.snug },
  plot: { aspectRatio: CHART_ASPECT, height: undefined },
});
