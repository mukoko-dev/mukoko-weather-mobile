/**
 * The page container for a weather screen: the sky behind the top of the page,
 * one scrolling column with the page gutter and the safe-area insets applied
 * ONCE, and the status bar that stays readable as the page scrolls.
 *
 * Every weather screen (the Weather tab, a place's page, their loading and
 * error states) renders inside this, so the gutter, the safe areas and the
 * sky are the same everywhere and no section sets its own page padding.
 *
 * - Gutter: `SPACE.gutter` on each side, never less than the safe-area inset.
 * - Top: the status bar's inset; the sky runs underneath it.
 * - Bottom: `SPACE.section` plus the home-indicator inset (unless the tab bar
 *   already sits there).
 * - Column: capped at `SIZE.contentMax` and centred on a tablet.
 * - Sky overscroll: pulling down past the top shows the sky's top colour.
 */

import { setStatusBarStyle } from "expo-status-bar";
import { useFocusEffect } from "expo-router";
import { type ReactNode, useCallback, useState } from "react";
import {
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePageColors } from "@/hooks/usePageColors";
import { type SkyFamily } from "@/shared/hero";
import { SIZE, SPACE } from "@/theme/mzizi";
import { SKY_FG, skyStops } from "@/theme/sky";

import { WeatherSky } from "./WeatherSky";

/**
 * Scroll offsets, in dp, between which the status bar's backing fades in and
 * its text flips from white-on-sky to the page's own. Past `end` the page's
 * cards are under the status bar, not the sky.
 */
export const STATUS_SCRIM = { start: 120, end: 180 } as const;

export type WeatherScrollProps = {
  family: SkyFamily;
  children: ReactNode;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  /** True inside the tab bar, which already clears the home indicator. */
  inTabs?: boolean;
};

/** The padding the column gets from the insets: gutter plus safe area. */
export function pagePadding(
  insets: { top: number; bottom: number; left: number; right: number },
  inTabs: boolean,
) {
  return {
    paddingTop: insets.top,
    paddingLeft: Math.max(SPACE.gutter, insets.left),
    paddingRight: Math.max(SPACE.gutter, insets.right),
    paddingBottom: SPACE.section + (inTabs ? 0 : insets.bottom),
  };
}

export function WeatherScroll({
  family,
  children,
  onRefresh,
  refreshing = false,
  inTabs = false,
}: WeatherScrollProps) {
  const insets = useSafeAreaInsets();
  const { colors, dark } = usePageColors();
  const [scrollY] = useState(() => new Animated.Value(0));
  const [onSky, setOnSky] = useState(true);
  const stops = skyStops(family, dark);

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const past = e.nativeEvent.contentOffset.y > STATUS_SCRIM.end;
        setOnSky((prev) => (prev === !past ? prev : !past));
      },
    },
  );

  // White status text while it sits on the sky, the page's own once cards
  // scroll under it; handed back to the system when the screen loses focus.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(onSky ? "light" : "auto");
      return () => setStatusBarStyle("auto");
    }, [onSky]),
  );

  const scrimOpacity = scrollY.interpolate({
    inputRange: [STATUS_SCRIM.start, STATUS_SCRIM.end],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={SKY_FG}
              colors={[colors.primary]}
              progressViewOffset={insets.top}
            />
          ) : undefined
        }
      >
        <View
          style={[styles.cap, { backgroundColor: stops.top }]}
          pointerEvents="none"
        />
        <WeatherSky family={family} />
        <View style={pagePadding(insets, inTabs)}>
          <View style={styles.column}>{children}</View>
        </View>
      </Animated.ScrollView>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.scrim,
          {
            height: insets.top,
            backgroundColor: colors.background,
            opacity: scrimOpacity,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  cap: {
    position: "absolute",
    top: -SIZE.overscrollCap,
    left: 0,
    right: 0,
    height: SIZE.overscrollCap,
  },
  column: {
    width: "100%",
    maxWidth: SIZE.contentMax,
    alignSelf: "center",
    gap: SPACE.section,
  },
  scrim: { position: "absolute", top: 0, left: 0, right: 0 },
});
