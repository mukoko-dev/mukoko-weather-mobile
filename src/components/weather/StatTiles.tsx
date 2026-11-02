/**
 * The app's one stat tile (the web's `StatGrid` of `.meerkat` tiles): a quiet
 * label over a value, with an optional quieter hint, one VoiceOver item
 * ("Label: value"). Used for a sheet's related readings, the haze card's
 * figures and the farm cards' stats.
 *
 * `on` says what the tile sits on, so it always stands apart from it: on the
 * page or a sheet (`page`) it is a bordered card; inside a card (`card`) it is
 * the dim nest the web draws there.
 *
 * Layouts: `StatGrid` (two columns that wrap) and `TilePairs` (rows of two,
 * one column at the largest text sizes).
 */

import { type ReactElement } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { useFarmColors } from "@/hooks/useFarmColors";
import { usePageColors } from "@/hooks/usePageColors";
import { BORDER, type PageColors, RADIUS, SPACE } from "@/theme/mzizi";

import { InsightRow } from "./InsightCard";
import { WxText } from "./WxText";

export type StatTileOn = "page" | "card";

export type StatTileProps = {
  label: string;
  value: string;
  /** A quieter line under the value (units, a source, a caveat). */
  hint?: string;
  /** The value's colour when it carries a tone; the primary text colour otherwise. */
  valueColor?: string;
  on?: StatTileOn;
};

/** The tile's surface, for a custom tile that must look the same. */
export function statTileSurface(
  on: StatTileOn,
  colors: Pick<PageColors, "card" | "border">,
  dim: string,
): ViewStyle[] {
  return on === "card"
    ? [styles.tile, { backgroundColor: dim, borderColor: "transparent" }]
    : [
        styles.tile,
        { backgroundColor: colors.card, borderColor: colors.border },
      ];
}

export function StatTile({
  label,
  value,
  hint,
  valueColor,
  on = "page",
}: StatTileProps) {
  const { colors } = usePageColors();
  const farm = useFarmColors();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${hint ? `. ${hint}` : ""}`}
      style={statTileSurface(on, colors, farm.surfaceDim)}
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

/** Two columns of `StatTile`s that wrap (one column at the largest text size). */
export function StatGrid({
  stats,
  on,
}: {
  stats: readonly { label: string; value: string }[];
  on?: StatTileOn;
}) {
  return (
    <View style={styles.grid}>
      {stats.map((s) => (
        <View key={s.label} style={styles.cell}>
          <StatTile label={s.label} value={s.value} on={on} />
        </View>
      ))}
    </View>
  );
}

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
  tile: {
    flex: 1,
    borderRadius: RADIUS.card,
    borderWidth: BORDER.rest,
    padding: SPACE.cozy,
    gap: SPACE.hair,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.stack },
  cell: { flexBasis: "45%", flexGrow: 1, minWidth: 0 },
  pairs: { gap: SPACE.snug },
});
