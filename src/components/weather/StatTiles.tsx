/**
 * The small inset tiles the farm cards share (the web's `StatGrid` of
 * `.meerkat` tiles): a quiet label over a value, two to a row on a phone and
 * one per row at the largest text sizes. Each tile is one VoiceOver item,
 * "Label: value".
 */

import { type ReactElement } from "react";
import { StyleSheet, View } from "react-native";

import { useFarmColors } from "@/hooks/useFarmColors";
import { usePageColors } from "@/hooks/usePageColors";
import { RADIUS, SPACE } from "@/theme/mzizi";

import { InsightRow } from "./InsightCard";
import { WxText } from "./WxText";

export type StatTileProps = {
  label: string;
  value: string;
  /** A quieter line under the value (units, a source, a caveat). */
  hint?: string;
  /** The value's colour when it carries a tone; the primary text colour otherwise. */
  valueColor?: string;
};

export function StatTile({ label, value, hint, valueColor }: StatTileProps) {
  const { colors } = usePageColors();
  const farm = useFarmColors();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${hint ? `. ${hint}` : ""}`}
      style={[styles.tile, { backgroundColor: farm.surfaceDim }]}
    >
      <WxText type="bodySm" color={colors.textTertiary}>
        {label}
      </WxText>
      <WxText type="body" weight={600} color={valueColor ?? colors.textPrimary}>
        {value}
      </WxText>
      {hint ? (
        <WxText type="bodySm" color={colors.textTertiary}>
          {hint}
        </WxText>
      ) : null}
    </View>
  );
}

/** A wrapper that gives a tile the shape of a window tile (no label/value split). */
export const tileStyle = () => styles.tile;

/** Rows of two tiles (one column at the largest text sizes). */
export function TilePairs({ tiles }: { tiles: ReactElement[] }) {
  const rows: ReactElement[][] = [];
  for (let i = 0; i < tiles.length; i += 2) rows.push(tiles.slice(i, i + 2));
  return (
    <View style={styles.pairs}>
      {rows.map((row, i) => (
        <InsightRow key={i}>{row}</InsightRow>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pairs: { gap: SPACE.snug },
  tile: {
    flex: 1,
    borderRadius: RADIUS.card,
    padding: SPACE.stack,
    gap: SPACE.hair,
  },
});
