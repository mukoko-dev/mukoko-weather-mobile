/**
 * The one detail sheet (the web's `DetailSheet`): a title, an optional
 * headline and sentence, the content, an optional plain explanation and a
 * Close button. On iOS it is the system page sheet (swipe down to dismiss); on
 * Android a full-screen modal that the back gesture closes. Used by the
 * Conditions tiles' details, the air-quality detail and the averages.
 *
 * Why the core `Modal` and not a native bottom sheet: it is the long-stable,
 * Expo Go-safe sheet on both platforms and it needs no native module.
 * A sheet is a modal task with a clear end, so it always has a Close button
 * (48 dp or taller) as well as the swipe, and VoiceOver is held inside it
 * (`accessibilityViewIsModal`).
 */

import { type ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useReduceMotion } from "@/hooks/useReduceMotion";
import { usePageColors } from "@/hooks/usePageColors";
import { BORDER, RADIUS, SIZE, SPACE, TOUCH } from "@/theme/mzizi";

import { WxText } from "./WxText";

export type DetailSheetProps = {
  open: boolean;
  /** The sheet's accessible name and its small uppercase label. */
  title: string;
  onClose: () => void;
  /** Under the title: the headline number or phrase. */
  headline?: string;
  /** Under the headline: the one-sentence insight. */
  sentence?: string;
  /** A plain explanation of the thing, after the content. */
  about?: string;
  children?: ReactNode;
  testID?: string;
};

export function DetailSheet({
  open,
  title,
  onClose,
  headline,
  sentence,
  about,
  children,
  testID,
}: DetailSheetProps) {
  const { colors } = usePageColors();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  return (
    <Modal
      visible={open}
      animationType={reduceMotion ? "none" : "slide"}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      testID={testID}
    >
      <View
        style={[styles.root, { backgroundColor: colors.background }]}
        accessibilityViewIsModal
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingLeft: Math.max(SPACE.gutter, insets.left),
              paddingRight: Math.max(SPACE.gutter, insets.right),
              paddingBottom: SPACE.section + insets.bottom,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <WxText
              type="bodySm"
              weight={600}
              uppercase
              tracking="wider"
              color={colors.textTertiary}
              accessibilityRole="header"
            >
              {title}
            </WxText>
            {headline ? (
              <WxText
                type="h2"
                weight={600}
                family="serif"
                tabular
                color={colors.textPrimary}
              >
                {headline}
              </WxText>
            ) : null}
            {sentence ? (
              <WxText type="body" color={colors.textSecondary}>
                {sentence}
              </WxText>
            ) : null}
          </View>

          {children}

          {about ? (
            <WxText type="bodySm" color={colors.textTertiary}>
              {about}
            </WxText>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            style={({ pressed }) => [
              styles.close,
              {
                borderColor: colors.border,
                borderWidth: pressed ? BORDER.active : BORDER.rest,
              },
            ]}
          >
            <WxText type="bodyLg" weight={600} color={colors.textPrimary}>
              Close
            </WxText>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

/**
 * A section inside a sheet: a serif h6 heading and its content, one stack
 * apart. The heading is a VoiceOver header.
 */
export function SheetSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  const { colors } = usePageColors();
  return (
    <View style={styles.section}>
      <WxText
        type="h6"
        weight={600}
        family="serif"
        color={colors.textPrimary}
        accessibilityRole="header"
      >
        {heading}
      </WxText>
      {children}
    </View>
  );
}

/** A label and its value on one row: the sheets' "related readings". */
export function StatTile({ label, value }: { label: string; value: string }) {
  const { colors } = usePageColors();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={[
        styles.stat,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <WxText type="bodySm" color={colors.textTertiary}>
        {label}
      </WxText>
      <WxText type="body" weight={600} color={colors.textPrimary}>
        {value}
      </WxText>
    </View>
  );
}

/** Two columns of `StatTile`s (one column at the largest text size). */
export function StatGrid({
  stats,
}: {
  stats: readonly { label: string; value: string }[];
}) {
  return (
    <View style={styles.statGrid}>
      {stats.map((s) => (
        <View key={s.label} style={styles.statCell}>
          <StatTile label={s.label} value={s.value} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingTop: SPACE.section, gap: SPACE.section },
  header: { gap: SPACE.hair },
  section: { gap: SPACE.stack },
  close: {
    minHeight: TOUCH.default,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SIZE.pillPadX,
  },
  stat: {
    flex: 1,
    borderRadius: RADIUS.card,
    borderWidth: BORDER.rest,
    padding: SPACE.cozy,
    gap: SPACE.hair,
  },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.stack },
  statCell: { flexBasis: "45%", flexGrow: 1, minWidth: 0 },
});
