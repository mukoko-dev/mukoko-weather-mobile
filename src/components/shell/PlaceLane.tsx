/**
 * The places lane in the middle of the bottom bar (the web's PlaceLane,
 * option B 2026-11-02): My Location first and pinned, then one chip per saved
 * place, scrolling sideways beside it. The current page's chip takes the
 * cobalt container fill and is announced as selected.
 *
 * Presentational: the bar passes the chips (from the ported pager) and what a
 * tap does, so this renders and tests on its own.
 */

import { type ComponentRef, useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";

import { NavigationIcon } from "@/components/icons/Icon";
import { WxText } from "@/components/weather/WxText";
import { usePageColors } from "@/hooks/usePageColors";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import {
  MY_LOCATION_NAME,
  homeChipShowsLabel,
  laneScrollLeft,
  type LaneChip,
} from "@/shared/location-pager";
import { BORDER, RADIUS, SIZE, SPACE, TOUCH } from "@/theme/mzizi";
import { BAR, chipColorsFor } from "@/theme/shell";

export type PlaceLaneProps = {
  chips: readonly LaneChip[];
  /** Index of the current page's chip, -1 when none is current. */
  activeIndex: number;
  onChipPress: (chip: LaneChip) => void;
};

export function PlaceLane({ chips, activeIndex, onChipPress }: PlaceLaneProps) {
  const { scheme } = usePageColors();
  const reduceMotion = useReduceMotion();
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const [viewport, setViewport] = useState(0);
  const [content, setContent] = useState(0);
  const [boxes, setBoxes] = useState<Record<string, { x: number; w: number }>>(
    {},
  );
  const home = chips.find((c) => c.kind === "home");
  const places = chips.filter((c) => c.kind === "place");
  const showHomeLabel = homeChipShowsLabel(chips.length);
  const active = activeIndex >= 0 ? chips[activeIndex] : undefined;
  const activeBox = active ? boxes[active.href] : undefined;

  // Keep the current chip centred (the web's laneScrollLeft), after a swipe
  // or a tap alike. My Location is outside the scroller: back to the start.
  useEffect(() => {
    if (activeIndex < 0 || viewport === 0) return;
    const x = laneScrollLeft(
      {
        viewport,
        content,
        itemLeft: activeBox?.x ?? 0,
        itemWidth: activeBox?.w ?? 0,
      },
      activeBox ? activeIndex : 0,
    );
    scroller.current?.scrollTo({ x, animated: !reduceMotion });
  }, [activeIndex, activeBox, viewport, content, reduceMotion]);

  const onChipLayout = (href: string) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setBoxes((prev) =>
      prev[href]?.x === x && prev[href]?.w === width
        ? prev
        : { ...prev, [href]: { x, w: width } },
    );
  };

  return (
    <View
      style={[styles.lane, places.length === 0 && styles.centred]}
      accessibilityLabel="Places"
    >
      {home ? (
        <Chip
          chip={home}
          current={chips.indexOf(home) === activeIndex}
          label={showHomeLabel ? home.name : undefined}
          scheme={scheme}
          onPress={onChipPress}
        />
      ) : null}
      {places.length > 0 ? (
        <ScrollView
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scroller}
          contentContainerStyle={styles.row}
          onLayout={(e) => setViewport(e.nativeEvent.layout.width)}
          onContentSizeChange={(w) => setContent(w)}
        >
          {places.map((chip) => (
            <View key={chip.href} onLayout={onChipLayout(chip.href)}>
              <Chip
                chip={chip}
                current={chips.indexOf(chip) === activeIndex}
                label={chip.name}
                scheme={scheme}
                onPress={onChipPress}
              />
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

function Chip({
  chip,
  current,
  label,
  scheme,
  onPress,
}: {
  chip: LaneChip;
  current: boolean;
  /** Visible text; My Location is the glyph alone beside places. */
  label?: string;
  scheme: "light" | "dark";
  onPress: (chip: LaneChip) => void;
}) {
  const { colors } = usePageColors();
  const chipColors = chipColorsFor(scheme);
  const fg = current ? chipColors.onActive : colors.textPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={chip.kind === "home" ? MY_LOCATION_NAME : chip.name}
      accessibilityState={{ selected: current }}
      accessibilityHint={current ? undefined : "Shows the weather here"}
      onPress={() => onPress(chip)}
      testID={`lane-chip-${chip.slug ?? "home"}`}
      style={({ pressed }) => [
        styles.chip,
        !label && styles.glyphOnly,
        {
          backgroundColor: current ? chipColors.active : chipColors.rest,
          borderColor: current ? chipColors.onActive : colors.border,
          borderWidth: current ? BORDER.active : BORDER.rest,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {chip.kind === "home" ? (
        <NavigationIcon size={SIZE.iconSm} color={fg} />
      ) : null}
      {label ? (
        <WxText
          type="body"
          weight={600}
          color={fg}
          numberOfLines={1}
          style={styles.chipText}
        >
          {label}
        </WxText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lane: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.tight,
  },
  centred: { justifyContent: "center" },
  scroller: { flex: 1, minWidth: 0 },
  row: {
    alignItems: "center",
    gap: SPACE.tight,
    paddingHorizontal: SPACE.hair,
  },
  chip: {
    minHeight: TOUCH.min,
    minWidth: TOUCH.min,
    maxWidth: BAR.chipMax,
    paddingHorizontal: SPACE.card,
    borderRadius: RADIUS.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACE.tight,
  },
  glyphOnly: { paddingHorizontal: 0 },
  chipText: { flexShrink: 1 },
});
