/**
 * The card surface the cards below the tiles share (the web's `.baobab` and
 * `.acacia`): the ordinary card colour with a solid 0.5 dp border all the way
 * round, `--space-card` padding, no shadow (Mzizi separates with borders). The
 * border carries the card's accent: the primary family at 25% for the common
 * card, malachite at 40% for the agriculture cards, the plain border colour
 * for a quiet card inside a page of cards.
 *
 * Also the small pieces every such card is made of: its heading (Noto Serif,
 * h6, weight 600), a body line and a quiet note.
 */

import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { useFarmColors } from "@/hooks/useFarmColors";
import { usePageColors } from "@/hooks/usePageColors";
import { BORDER, RADIUS, SPACE, withAlpha } from "@/theme/mzizi";

import { WxText } from "./WxText";

export type CardAccent = "primary" | "malachite" | "quiet";

export type PlaceCardProps = {
  accent?: CardAccent;
  children: ReactNode;
  testID?: string;
};

export function PlaceCard({
  accent = "primary",
  children,
  testID,
}: PlaceCardProps) {
  const { colors } = usePageColors();
  const farm = useFarmColors();
  const border =
    accent === "malachite"
      ? withAlpha(farm.malachite, 0.4)
      : accent === "quiet"
        ? colors.border
        : withAlpha(colors.primary, 0.25);
  return (
    <View
      testID={testID}
      style={[styles.card, { backgroundColor: colors.card, borderColor: border }]}
    >
      {children}
    </View>
  );
}

/** A card's heading: a real heading to VoiceOver. */
export function CardHeading({
  children,
  color,
}: {
  children: string;
  color?: string;
}) {
  const { colors } = usePageColors();
  return (
    <WxText
      type="h6"
      weight={600}
      family="serif"
      color={color ?? colors.textPrimary}
      accessibilityRole="header"
    >
      {children}
    </WxText>
  );
}

/** Body copy (the web's `.gazelle`). */
export function CardBody({ children }: { children: ReactNode }) {
  const { colors } = usePageColors();
  return (
    <WxText type="body" color={colors.textSecondary}>
      {children}
    </WxText>
  );
}

/** A quiet line: sources, hedges, hints (the web's `.dove`). */
export function CardNote({
  children,
  color,
}: {
  children: ReactNode;
  color?: string;
}) {
  const { colors } = usePageColors();
  return (
    <WxText type="bodySm" color={color ?? colors.textTertiary}>
      {children}
    </WxText>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    borderWidth: BORDER.rest,
    padding: SPACE.card,
    gap: SPACE.stack,
  },
});
