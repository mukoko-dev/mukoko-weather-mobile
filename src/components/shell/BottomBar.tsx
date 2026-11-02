/**
 * The phone bottom bar: ONE floating pill, as the web's (`MobileNav` on the
 * vendored Mzizi bottom nav, option B 2026-11-02). Map is pinned at the start,
 * the places lane (My Location, then the saved places) fills the middle, and
 * Locations is pinned at the end.
 *
 * Drawn natively: on iOS 26 the pill is Liquid Glass (expo-glass-effect);
 * elsewhere it is the translucent card surface with the 0.5 dp token border.
 * Inset 16 from both edges, lifted 12 above the safe area, 64 tall.
 *
 * Presentational: AppChrome passes the chips and the actions.
 */

import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { WxText } from "@/components/weather/WxText";
import { usePageColors } from "@/hooks/usePageColors";
import { type LaneChip } from "@/shared/location-pager";
import { BORDER, RADIUS, SIZE, SPACE, TOUCH, withAlpha } from "@/theme/mzizi";
import { BAR, chipColorsFor } from "@/theme/shell";

import { PlaceLane } from "./PlaceLane";
import { ListIcon, MapIcon } from "./ShellIcons";

export type BottomBarProps = {
  chips: readonly LaneChip[];
  activeIndex: number;
  activeId: "locations" | "map" | "none";
  /** False while no place is on screen: the map has nothing to show yet. */
  hasMapLocation: boolean;
  onChipPress: (chip: LaneChip) => void;
  onMap: () => void;
  onLocations: () => void;
};

function glassAvailable(): boolean {
  try {
    return Platform.OS === "ios" && isLiquidGlassAvailable();
  } catch {
    return false;
  }
}

export function BottomBar({
  chips,
  activeIndex,
  activeId,
  hasMapLocation,
  onChipPress,
  onMap,
  onLocations,
}: BottomBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, scheme } = usePageColors();
  const glass = glassAvailable();

  const surface = {
    borderColor: colors.border,
    backgroundColor: glass
      ? "transparent"
      : withAlpha(colors.card, BAR.surfaceAlpha),
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.dock, { bottom: insets.bottom + BAR.lift }]}
      testID="bottom-bar"
    >
      <View
        accessibilityRole="toolbar"
        accessibilityLabel="Mobile navigation"
        style={[styles.pill, surface]}
      >
        {glass ? (
          <GlassView
            style={StyleSheet.absoluteFill}
            glassEffectStyle="regular"
            colorScheme={scheme}
          />
        ) : null}
        <BarItem
          label="Map"
          accessibilityLabel={
            hasMapLocation
              ? "Weather map"
              : "Choose a location for the weather map"
          }
          current={activeId === "map"}
          onPress={onMap}
          testID="bar-map"
          icon={(c) => <MapIcon size={SIZE.iconMd} color={c} />}
        />
        <PlaceLane
          chips={chips}
          activeIndex={activeIndex}
          onChipPress={onChipPress}
        />
        <BarItem
          label="Locations"
          accessibilityLabel="All locations"
          current={activeId === "locations"}
          onPress={onLocations}
          testID="bar-locations"
          icon={(c) => <ListIcon size={SIZE.iconMd} color={c} />}
        />
      </View>
    </View>
  );
}

function BarItem({
  label,
  accessibilityLabel,
  current,
  onPress,
  icon,
  testID,
}: {
  label: string;
  accessibilityLabel: string;
  current: boolean;
  onPress: () => void;
  icon: (color: string) => ReactNode;
  testID: string;
}) {
  const { colors, scheme } = usePageColors();
  const chip = chipColorsFor(scheme);
  const fg = current ? chip.onActive : colors.textSecondary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: current }}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.item,
        current && { backgroundColor: chip.active },
        pressed && { backgroundColor: withAlpha(colors.textPrimary, 0.08) },
      ]}
    >
      {icon(fg)}
      <WxText type="caption" weight={600} color={fg} numberOfLines={1}>
        {label}
      </WxText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: "absolute",
    left: BAR.side,
    right: BAR.side,
    alignItems: "center",
  },
  pill: {
    width: "100%",
    maxWidth: BAR.maxWidth,
    height: BAR.height,
    borderRadius: RADIUS.pill,
    borderWidth: BORDER.rest,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.hair,
    paddingHorizontal: BAR.pad,
  },
  item: {
    minWidth: TOUCH.min,
    minHeight: TOUCH.min,
    paddingHorizontal: SPACE.snug,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
