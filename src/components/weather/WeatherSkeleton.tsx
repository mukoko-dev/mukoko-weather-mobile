/**
 * The loading state: a structural skeleton of the real page on the SAME sky, so
 * nothing moves when the weather arrives (Apple's launching guidance: make it
 * nearly identical to the first screen; no splash, no logo, no sentence).
 *
 * The hero is the hero's own rows as bars: each row has the real type size and
 * leading around a bar 0.7 em tall, so the hero is exactly as tall as the
 * loaded one. Then the Conditions card (heading, a typical two-line outlook,
 * hour tiles) and a grid of tile placeholders on the ordinary card surface.
 * The bars pulse slowly; with Reduce Motion they are still. VoiceOver hears one
 * busy "Loading weather" item, never the bars.
 */

import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { usePageColors } from "@/hooks/usePageColors";
import { type SkyFamily } from "@/shared/hero";
import {
  BORDER,
  RADIUS,
  SIZE,
  SPACE,
  TOUCH,
  type TypeToken,
  TYPE,
  lineHeightOf,
  withAlpha,
} from "@/theme/mzizi";
import { NEUTRAL_SKY, SKY_FG, SKY_SURFACE } from "@/theme/sky";

import { Bar, ShimmerProvider } from "./Shimmer";
import { WeatherScroll } from "./WeatherScroll";

/** Typical bar widths, in dp: the middle of what the loaded text measures. */
const WIDTH = {
  crumb: 160,
  eyebrow: 96,
  name: 176,
  condition: 112,
  highLow: 128,
  heading: 96,
  label: 64,
  hour: 36,
  temp: 28,
  dial: 80,
  sentence: "75%",
} as const;

/** The pieces of the skeleton the tests count. */
export const SKELETON = { hours: 8, tilesRows: 2 } as const;

/** A row of the real text size and leading holding one bar 0.7 em tall. */
function TextBar({
  type,
  width,
  color,
  align = "center",
}: {
  type: TypeToken;
  width: number | `${number}%`;
  color: string;
  align?: "center" | "flex-start";
}) {
  return (
    <View
      style={{
        height: lineHeightOf(type),
        justifyContent: "center",
        alignItems: align,
      }}
    >
      <Bar
        color={color}
        width={width}
        height={Math.round(TYPE[type].size * 0.7)}
      />
    </View>
  );
}

/** The top row: a live control at the left if given, else a bar; bars at the right. */
function TopRowSkeleton({ leading }: { leading?: ReactNode }) {
  const bar = withAlpha(SKY_FG, 0.18);
  return (
    <View style={styles.topRow} testID="skeleton-top-row">
      {leading ?? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Bar
            color={bar}
            width={WIDTH.crumb}
            height={Math.round(TYPE.bodySm.size * 0.8)}
          />
        </View>
      )}
      <View
        style={styles.controls}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Bar
          color={bar}
          width={TOUCH.min}
          height={TOUCH.min}
          radius={RADIUS.pill}
        />
        <Bar
          color={bar}
          width={TOUCH.min}
          height={TOUCH.min}
          radius={RADIUS.pill}
        />
      </View>
    </View>
  );
}

/** The hero's centred stack, row for row. */
function HeroSkeleton() {
  const bar = withAlpha(SKY_FG, 0.18);
  return (
    <View style={styles.stack} testID="skeleton-hero">
      <TextBar type="caption" width={WIDTH.eyebrow} color={bar} />
      <TextBar type="h2" width={WIDTH.name} color={bar} />
      <View style={styles.next}>
        <TextBar
          type="display"
          width={Math.round(TYPE.display.size * 1.6)}
          color={bar}
        />
      </View>
      <View style={[styles.next, styles.condition]}>
        <Bar
          color={bar}
          width={SIZE.iconHero}
          height={SIZE.iconHero}
          radius={RADIUS.pill}
        />
        <TextBar type="h5" width={WIDTH.condition} color={bar} />
      </View>
      <View style={styles.next}>
        <TextBar type="bodyLg" width={WIDTH.highLow} color={bar} />
      </View>
    </View>
  );
}

function ConditionsSkeleton() {
  const bar = withAlpha(SKY_FG, 0.18);
  return (
    <View
      testID="skeleton-conditions"
      style={[
        styles.skyCard,
        {
          backgroundColor: withAlpha(SKY_FG, SKY_SURFACE.card.fill),
          borderColor: withAlpha(SKY_FG, SKY_SURFACE.card.border),
        },
      ]}
    >
      <TextBar type="h6" width={WIDTH.heading} color={bar} align="flex-start" />
      <View
        style={[
          styles.outlook,
          { borderBottomColor: withAlpha(SKY_FG, SKY_SURFACE.card.border) },
        ]}
      >
        <TextBar type="body" width="100%" color={bar} align="flex-start" />
        <TextBar
          type="body"
          width={WIDTH.sentence}
          color={bar}
          align="flex-start"
        />
      </View>
      <View style={styles.hours}>
        {Array.from({ length: SKELETON.hours }, (_, i) => (
          <View key={i} style={styles.hour}>
            <Bar
              color={bar}
              width={WIDTH.hour}
              height={Math.round(TYPE.body.size * 0.7)}
            />
            <Bar
              color={bar}
              width={SIZE.iconMd}
              height={SIZE.iconMd}
              radius={RADIUS.pill}
            />
            <Bar
              color={bar}
              width={WIDTH.temp}
              height={Math.round(TYPE.body.size * 0.7)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

function TilesSkeleton() {
  const { colors } = usePageColors();
  const bar = withAlpha(colors.textTertiary, 0.18);
  return (
    <View testID="skeleton-tiles" style={styles.tiles}>
      {Array.from({ length: SKELETON.tilesRows }, (_, row) => (
        <View key={row} style={styles.tileRow}>
          {[0, 1].map((col) => (
            <View
              key={col}
              style={[
                styles.tile,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Bar
                color={bar}
                width={WIDTH.label}
                height={Math.round(TYPE.bodySm.size * 0.8)}
              />
              <View style={styles.tileBody}>
                <Bar
                  color={bar}
                  width={WIDTH.dial}
                  height={WIDTH.dial}
                  radius={RADIUS.pill}
                />
              </View>
              <Bar
                color={bar}
                width={WIDTH.sentence}
                height={Math.round(TYPE.bodySm.size * 0.7)}
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export type WeatherSkeletonProps = {
  /** The sky to paint: the last known family, else a neutral overcast day. */
  family?: SkyFamily;
  inTabs?: boolean;
  /** A real control at the left of the top row (Back), live while loading. */
  leading?: ReactNode;
};

export function WeatherSkeleton({
  family = NEUTRAL_SKY,
  inTabs = false,
  leading,
}: WeatherSkeletonProps) {
  return (
    <WeatherScroll family={family} inTabs={inTabs}>
      <ShimmerProvider>
        <View testID="weather-skeleton">
          <TopRowSkeleton leading={leading} />
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="Loading weather"
            accessibilityState={{ busy: true }}
            style={styles.page}
          >
            <HeroSkeleton />
            <ConditionsSkeleton />
            <TilesSkeleton />
          </View>
        </View>
      </ShimmerProvider>
    </WeatherScroll>
  );
}

const styles = StyleSheet.create({
  page: { gap: SPACE.section },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACE.stack,
    paddingTop: SPACE.hair,
  },
  controls: { flexDirection: "row", gap: SPACE.snug },
  stack: {
    alignItems: "center",
    paddingTop: SPACE.heroTop,
    paddingBottom: SPACE.heroBottom,
  },
  next: { marginTop: SPACE.hair },
  condition: { flexDirection: "row", alignItems: "center", gap: SPACE.tight },
  skyCard: {
    borderRadius: RADIUS.skyCard,
    borderWidth: BORDER.sky,
    padding: SPACE.card,
    overflow: "hidden",
  },
  outlook: {
    marginTop: SPACE.hair,
    paddingBottom: SPACE.stack,
    borderBottomWidth: BORDER.rest,
  },
  hours: {
    flexDirection: "row",
    gap: SPACE.cozy,
    marginTop: SPACE.stack,
    paddingBottom: SPACE.snug,
    overflow: "hidden",
  },
  hour: {
    minWidth: SIZE.hourTileMin,
    alignItems: "center",
    gap: SPACE.tight,
    paddingHorizontal: SPACE.cozy,
    paddingVertical: SPACE.snug,
  },
  tiles: { gap: SPACE.stack },
  tileRow: { flexDirection: "row", gap: SPACE.stack },
  tile: {
    flex: 1,
    minHeight: SIZE.insightMin,
    borderRadius: RADIUS.card,
    borderWidth: BORDER.rest,
    padding: SPACE.card,
    gap: SPACE.stack,
  },
  tileBody: { flex: 1, alignItems: "center", justifyContent: "center" },
});
