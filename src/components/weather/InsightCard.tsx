/**
 * The shell every metric tile shares (the web's `InsightCard` inside an
 * `EdgeTile`): an uppercase label with its icon, the visual or value, and one
 * sentence of insight at the foot. The card is the ordinary card surface with
 * a solid 0.5 dp border all the way round, tinted with the tile's mineral at
 * 60% (never one side, never a shadow). A square tile has a minimum height, not
 * a fixed ratio, so a heading, a value and a sentence always fit.
 *
 * A tile reads as one item to VoiceOver: "Wind. <sentence>".
 */

import { type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

import { usePageColors } from "@/hooks/usePageColors";
import {
  BORDER,
  type Mineral,
  RADIUS,
  SIZE,
  SPACE,
  mineralEdge,
} from "@/theme/mzizi";

import { WxText } from "./WxText";

export type InsightCardProps = {
  label: string;
  icon: (color: string) => ReactNode;
  mineral: Mineral;
  sentence?: string;
  /** What VoiceOver reads for the visual, before the sentence. */
  summary?: string;
  /** A wide tile spans the row and takes its natural height. */
  wide?: boolean;
  /**
   * Makes the whole tile one button that opens its detail (the web's
   * `CardHitArea`): a tile is the entry point, so nothing inside it is a
   * second button. Without it the tile is a plain, readable card.
   */
  onPress?: () => void;
  children: ReactNode;
};

export function InsightCard({
  label,
  icon,
  mineral,
  sentence,
  summary,
  wide = false,
  onPress,
  children,
}: InsightCardProps) {
  const { colors, scheme } = usePageColors();
  const spoken = [label, summary, sentence].filter(Boolean).join(". ");
  const body = (
    <>
      <View style={styles.header}>
        {icon(colors.textTertiary)}
        <WxText
          type="bodySm"
          weight={600}
          uppercase
          tracking="wider"
          color={colors.textTertiary}
          accessibilityRole="header"
        >
          {label}
        </WxText>
      </View>
      <View style={styles.body}>{children}</View>
      {sentence ? (
        <WxText type="bodySm" color={colors.textTertiary}>
          {sentence}
        </WxText>
      ) : null}
    </>
  );
  const surface = {
    backgroundColor: colors.card,
    borderColor: mineralEdge(mineral, scheme),
  };

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={spoken}
        accessibilityHint="Opens details"
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          surface,
          wide ? null : styles.square,
          // Mzizi: a card that can be pressed takes the active border.
          pressed ? styles.pressed : null,
        ]}
      >
        {body}
      </Pressable>
    );
  }
  return (
    <View
      accessible
      accessibilityLabel={spoken}
      style={[styles.card, surface, wide ? null : styles.square]}
    >
      {body}
    </View>
  );
}

/**
 * Past this text-size multiplier the grid is one column: two columns of large
 * text leave a tile too narrow for its visual (Dynamic Type).
 */
export const SINGLE_COLUMN_FONT_SCALE = 1.35;

/**
 * The tile grid: a vertical stack of rows (`InsightRow` for two square tiles, a
 * wide tile alone), `--space-stack` apart. Two columns on a phone, one at the
 * largest text sizes.
 */
export function InsightGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

/** Two square tiles side by side (a single column at the largest text size). */
export function InsightRow({ children }: { children: ReactNode[] }) {
  const { fontScale } = useWindowDimensions();
  const single = fontScale > SINGLE_COLUMN_FONT_SCALE;
  return (
    <View style={single ? styles.column : styles.row}>
      {children.map((child, i) => (
        <View key={i} style={single ? styles.fullCell : styles.cell}>
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    borderWidth: BORDER.rest,
    padding: SPACE.card,
    gap: SPACE.stack,
    flexGrow: 1,
    minWidth: 0,
  },
  square: { minHeight: SIZE.insightMin },
  pressed: { borderWidth: BORDER.active },
  header: { flexDirection: "row", alignItems: "center", gap: SPACE.tight },
  body: { flex: 1, alignItems: "center", justifyContent: "center" },
  grid: { gap: SPACE.stack },
  row: { flexDirection: "row", gap: SPACE.stack, alignItems: "stretch" },
  cell: { flex: 1, minWidth: 0, flexDirection: "column" },
  column: { gap: SPACE.stack },
  fullCell: { minWidth: 0 },
});
