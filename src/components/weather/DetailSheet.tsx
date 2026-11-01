/**
 * The one sheet scaffold for detail on the weather page (the web's
 * `DetailSheet`: a bottom sheet on a phone with a title, a description and a
 * Close action). The activity picker, the activity advice and the report
 * wizard are built on it.
 *
 * The platform sheet pattern (Apple HIG, Sheets and Modality):
 *
 * - iOS presents the system page sheet (`presentationStyle="pageSheet"`): the
 *   native card with its grabber, swipe down to dismiss and the page behind
 *   it scaled back. Nothing is drawn by the app for that.
 * - Android draws a bottom sheet over a scrim: rounded top corners, a grabber,
 *   tap the scrim or press Back to dismiss, at most 90% of the screen high.
 *
 * Both always have a visible Close button (48 dp), because dismissing by
 * gesture alone is not available to everyone. The title is a heading; the
 * panel is announced as a modal so VoiceOver and TalkBack stay inside it. With
 * Reduce Motion on the sheet fades instead of sliding. Borders, not shadows.
 */

import { type ReactNode } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useReduceMotion } from "@/hooks/useReduceMotion";
import { usePageColors } from "@/hooks/usePageColors";
import { BORDER, RADIUS, SPACE, TOUCH, withAlpha } from "@/theme/mzizi";
import { LANE } from "@/theme/ratings";

import { WxText } from "./WxText";

/** The scrim behind the Android sheet. */
const SCRIM = 0.4;
/** The tallest the Android sheet gets, as a fraction of the screen. */
const MAX_HEIGHT = "90%";

export type DetailSheetProps = {
  visible: boolean;
  title: string;
  /** One sentence under the title; read by the screen reader after it. */
  description?: string;
  onClose: () => void;
  children: ReactNode;
  /** Pinned under the scrolling body (a primary action). */
  footer?: ReactNode;
  testID?: string;
};

export function DetailSheet({
  visible,
  title,
  description,
  onClose,
  children,
  footer,
  testID,
}: DetailSheetProps) {
  const { colors } = usePageColors();
  const reduceMotion = useReduceMotion();
  const insets = useSafeAreaInsets();
  const ios = Platform.OS === "ios";

  const panel = (
    <View
      accessibilityViewIsModal
      testID={testID}
      style={[
        ios ? styles.pageSheet : styles.androidSheet,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {ios ? null : (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.grabber, { backgroundColor: colors.border }]}
        />
      )}
      <View style={styles.header}>
        <View style={styles.titles}>
          <WxText
            type="h4"
            weight={600}
            family="serif"
            color={colors.textPrimary}
            accessibilityRole="header"
          >
            {title}
          </WxText>
          {description ? (
            <WxText type="bodySm" color={colors.textTertiary}>
              {description}
            </WxText>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Close ${title}`}
          onPress={onClose}
          hitSlop={SPACE.snug}
          style={({ pressed }) => [
            styles.close,
            {
              borderColor: colors.border,
              backgroundColor: pressed
                ? withAlpha(colors.textPrimary, 0.08)
                : "transparent",
            },
          ]}
        >
          <WxText type="body" weight={600} color={colors.textPrimary}>
            Close
          </WxText>
        </Pressable>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          { paddingBottom: footer ? SPACE.section : insets.bottom + SPACE.section },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              borderTopColor: colors.border,
              paddingBottom: insets.bottom + SPACE.section,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType={reduceMotion ? "fade" : "slide"}
      presentationStyle={ios ? "pageSheet" : undefined}
      transparent={!ios}
      onRequestClose={onClose}
      statusBarTranslucent={!ios}
      navigationBarTranslucent={!ios}
    >
      {ios ? (
        panel
      ) : (
        <View style={styles.overlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Close ${title}`}
            onPress={onClose}
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: withAlpha(colors.textPrimary, SCRIM) },
            ]}
          />
          {panel}
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  pageSheet: { flex: 1 },
  androidSheet: {
    maxHeight: MAX_HEIGHT,
    borderTopLeftRadius: RADIUS.skyCard,
    borderTopRightRadius: RADIUS.skyCard,
    borderWidth: BORDER.rest,
    borderBottomWidth: 0,
    overflow: "hidden",
  },
  grabber: {
    alignSelf: "center",
    width: LANE.grabberWidth,
    height: LANE.grabberHeight,
    borderRadius: RADIUS.pill,
    marginTop: SPACE.snug,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACE.stack,
    paddingHorizontal: SPACE.card,
    paddingTop: SPACE.card,
    paddingBottom: SPACE.snug,
  },
  titles: { flex: 1, gap: SPACE.hair },
  close: {
    minHeight: TOUCH.min,
    minWidth: TOUCH.min,
    paddingHorizontal: SPACE.card,
    borderRadius: RADIUS.pill,
    borderWidth: BORDER.rest,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flexShrink: 1 },
  body: { paddingHorizontal: SPACE.card, gap: SPACE.stack },
  footer: {
    paddingHorizontal: SPACE.card,
    paddingTop: SPACE.stack,
    borderTopWidth: BORDER.rest,
  },
});
