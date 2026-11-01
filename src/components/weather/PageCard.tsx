/**
 * An ordinary card on the page below the sky (the web's `.baobab` / `.acacia`):
 * the card surface, a 0.5 dp border all the way round (never one side, never a
 * shadow), the card radius and padding, and an optional heading row with an
 * action at the end. A mineral may tint the WHOLE border; the border is a
 * solid line in `borderColor`, nothing else.
 *
 * The heading is a real heading for VoiceOver. Used by the Community lane, the
 * activity invitation, the reports list, and the AI cards.
 */

import { type ReactNode } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

import { usePageColors } from "@/hooks/usePageColors";
import { BORDER, RADIUS, SPACE } from "@/theme/mzizi";

import { WxText } from "./WxText";

export type PageCardProps = ViewProps & {
  title?: string;
  /** Beside the heading, at the end (a small action). */
  headerEnd?: ReactNode;
  /** Tints the whole border (a category mineral at 40%); default `colors.border`. */
  borderColor?: string;
  /** An icon before the heading. */
  headerStart?: ReactNode;
  children: ReactNode;
};

export function PageCard({
  title,
  headerEnd,
  headerStart,
  borderColor,
  children,
  style,
  ...rest
}: PageCardProps) {
  const { colors } = usePageColors();
  return (
    <View
      {...rest}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: borderColor ?? colors.border,
        },
        style,
      ]}
    >
      {title ? (
        <View style={styles.header}>
          <View style={styles.title}>
            {headerStart}
            <WxText
              type="h6"
              weight={600}
              family="serif"
              color={colors.textPrimary}
              accessibilityRole="header"
              style={styles.titleText}
            >
              {title}
            </WxText>
          </View>
          {headerEnd}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    borderWidth: BORDER.rest,
    padding: SPACE.card,
    gap: SPACE.stack,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACE.stack,
  },
  title: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.snug,
  },
  titleText: { flexShrink: 1 },
});
