/**
 * SectionCard — a titled BaobabCard used to group a settings section on the
 * "My" screen. Keeps the section header + optional hint consistent across the
 * saved-locations, theme, and activities blocks.
 */

import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { SPACING } from "@/brand/tokens";
import { BaobabCard } from "@/components/BaobabCard";
import { BrandText } from "@/components/BrandText";

export type SectionCardProps = {
  title: string;
  /** Optional trailing node in the header row (e.g. a count badge). */
  trailing?: ReactNode;
  /** Optional caption rendered under the title. */
  hint?: string;
  children: ReactNode;
};

export function SectionCard({
  title,
  trailing,
  hint,
  children,
}: SectionCardProps) {
  return (
    <BaobabCard>
      <View style={styles.headerRow}>
        <BrandText
          variant="smallBold"
          tone="textSecondary"
          style={styles.title}
        >
          {title.toUpperCase()}
        </BrandText>
        {trailing ? <View>{trailing}</View> : null}
      </View>
      {hint ? (
        <BrandText variant="caption" tone="textTertiary">
          {hint}
        </BrandText>
      ) : null}
      <View style={styles.body}>{children}</View>
    </BaobabCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  title: {
    letterSpacing: 0.6,
  },
  body: {
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
});
