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
 * - Bottom: `SPACE.section` plus the floating bottom bar's clearance where the
 *   shell draws it (AppChrome), else the home-indicator inset.
 * - Swipe: left / right between places, from the shell (useLocationSwipe).
 * - Column: capped at `SIZE.contentMax` and centred on a tablet.
 * - Sky overscroll: pulling down past the top shows the sky's top colour.
 */

import { setStatusBarStyle } from "expo-status-bar";
import { useFocusEffect } from "expo-router";
import {
  type ComponentRef,
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SwipeFrame } from "@/components/shell/SwipeFrame";
import { useShell } from "@/components/shell/ShellContext";
import { usePageColors } from "@/hooks/usePageColors";
import { type SkyFamily } from "@/shared/hero";
import { SIZE, SPACE } from "@/theme/mzizi";
import { SKY_FG, SKY_REACH, skyStops } from "@/theme/sky";

import { SkyExtentContext } from "./SkyExtent";
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

/**
 * The padding the column gets from the insets: gutter plus safe area. Where
 * the shell's floating bar sits over the page (`barClearance` > 0) the page
 * leaves that instead, which already includes the home-indicator inset.
 */
export function pagePadding(
  insets: { top: number; bottom: number; left: number; right: number },
  inTabs: boolean,
  barClearance = 0,
) {
  const bottom = barClearance > 0 ? barClearance : inTabs ? 0 : insets.bottom;
  return {
    paddingTop: insets.top,
    paddingLeft: Math.max(SPACE.gutter, insets.left),
    paddingRight: Math.max(SPACE.gutter, insets.right),
    paddingBottom: SPACE.section + bottom,
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
  const { clearance, swipe, inShell, noSwipe } = useShell();
  const { colors, dark } = usePageColors();
  const [scrollY] = useState(() => new Animated.Value(0));
  const [onSky, setOnSky] = useState(true);
  const stops = skyStops(family, dark);
  // How far the sky must reach for the headings drawn on it (SkyExtent).
  const content = useRef<ComponentRef<typeof View>>(null);
  const [minReach, setMinReach] = useState(0);
  const sky = useMemo(
    () => ({
      content,
      extendTo: (bottom: number) => {
        const reach = Math.ceil(bottom + SKY_REACH.fade);
        setMinReach((prev) => (reach > prev ? reach : prev));
      },
    }),
    [],
  );

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

  const scroll = (
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
      <WeatherSky family={family} minReach={minReach} />
      <View ref={content} style={pagePadding(insets, inTabs, clearance)}>
        <SkyExtentContext.Provider value={sky}>
          <View style={styles.column}>{children}</View>
        </SkyExtentContext.Provider>
      </View>
    </Animated.ScrollView>
  );
  const scrim = (
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
  );
  const rootStyle = [styles.root, { backgroundColor: colors.background }];

  // Inside the shell the page is always framed for swiping (SwipeFrame), so
  // the tree never changes when swiping turns on or off: the pan is simply
  // enabled or not. Outside the shell (a screen alone, tests) it is plain.
  return inShell && noSwipe ? (
    <SwipeFrame
      swipe={swipe}
      noSwipe={noSwipe}
      style={rootStyle}
      scroll={scroll}
    >
      {scrim}
    </SwipeFrame>
  ) : (
    <View style={rootStyle}>
      {scroll}
      {scrim}
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
