/**
 * An ordinary card on a sub-route (the web's `.baobab`): the card surface, a
 * 0.5 dp border all the way round (the primary at 25%, or the plain border for
 * a quieter card), the card padding, a serif title and an optional quiet line
 * under it. Borders, not shadows.
 */

import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { usePageColors } from "@/hooks/usePageColors";
import { BORDER, RADIUS, SPACE, withAlpha } from "@/theme/mzizi";

import { SectionHeader } from "./SectionHeader";
import { WxText } from "./WxText";

export type PageCardProps = {
  title: string;
  /** A quiet line under the title. */
  subtitle?: string;
  /** `primary` is the web's `.baobab`, `quiet` its `.acacia`. */
  tone?: "primary" | "quiet";
  testID?: string;
  children: ReactNode;
};

export function PageCard({
  title,
  subtitle,
  tone = "primary",
  testID,
  children,
}: PageCardProps) {
  const { colors } = usePageColors();
  return (
    <View
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor:
            tone === "primary" ? withAlpha(colors.primary, 0.25) : colors.border,
        },
      ]}
    >
      <View>
        <SectionHeader
          title={title}
          titleColor={colors.textPrimary}
          actionColor={colors.primary}
        />
        {subtitle ? (
          <WxText type="body" color={colors.textTertiary}>
            {subtitle}
          </WxText>
        ) : null}
      </View>
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
});
