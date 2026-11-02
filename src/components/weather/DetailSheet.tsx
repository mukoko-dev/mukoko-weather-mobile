/**
 * The one detail sheet (the web's `DetailSheet`): a title, an optional
 * headline and sentence, the content, an optional plain explanation and a
 * Close button. On iOS it is the system page sheet (swipe down to dismiss); on
 * Android a full-screen modal that the back gesture closes. Used by the
 * Conditions tiles' details, the air-quality detail, the averages, the
 * activity picker and advice, and the report wizard: the app's ONE sheet.
 *
 * Why the core `Modal` and not a native bottom sheet: it is the long-stable,
 * Expo Go-safe sheet on both platforms and it needs no native module.
 * A sheet is a modal task with a clear end, so it always has a Close button
 * (48 dp or taller) as well as the swipe, and VoiceOver is held inside it
 * (`accessibilityViewIsModal`).
 */

import {
  type ComponentRef,
  type MutableRefObject,
  type ReactNode,
  useEffect,
  useRef,
} from "react";
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
  /** One sentence under the title saying what the sheet is for. */
  description?: string;
  children?: ReactNode;
  /** Pinned under the scrolling body (a primary action, such as Done). */
  footer?: ReactNode;
  /**
   * Filled in with a function that scrolls the body to `y`, for a sheet that
   * scrolls to one of its items.
   */
  scrollToRef?: MutableRefObject<
    ((y: number, animated: boolean) => void) | null
  >;
  testID?: string;
};

/**
 * The sheet's content, mounted only while the sheet is open (so a closed sheet
 * costs nothing and needs no safe-area provider).
 */
function SheetBody({
  title,
  onClose,
  headline,
  sentence,
  about,
  description,
  children,
  footer,
  scrollToRef,
}: Omit<DetailSheetProps, "open" | "testID">) {
  const { colors } = usePageColors();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    if (!scrollToRef) return;
    scrollToRef.current = (y, animated) =>
      scroll.current?.scrollTo({ y, animated });
    return () => {
      scrollToRef.current = null;
    };
  }, [scrollToRef]);
  const sidePadding = {
    paddingLeft: Math.max(SPACE.gutter, insets.left),
    paddingRight: Math.max(SPACE.gutter, insets.right),
  };
  return (
    <View
      style={[styles.root, { backgroundColor: colors.background }]}
      accessibilityViewIsModal
    >
      <ScrollView
        ref={scroll}
        contentContainerStyle={[
          styles.content,
          sidePadding,
          { paddingBottom: SPACE.section + (footer ? 0 : insets.bottom) },
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
          {description ? (
            <WxText type="body" color={colors.textSecondary}>
              {description}
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
          accessibilityLabel={`Close ${title}`}
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
      {footer ? (
        <View
          style={[
            styles.footer,
            sidePadding,
            {
              paddingBottom: SPACE.stack + insets.bottom,
              borderTopColor: colors.border,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

export function DetailSheet({ open, testID, ...body }: DetailSheetProps) {
  const reduceMotion = useReduceMotion();
  return (
    <Modal
      visible={open}
      animationType={reduceMotion ? "none" : "slide"}
      presentationStyle="pageSheet"
      onRequestClose={body.onClose}
      testID={testID}
    >
      <SheetBody {...body} />
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

// The sheets' "related readings" are the app's one stat tile, in StatTiles.tsx.
export { StatGrid, StatTile } from "./StatTiles";

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingTop: SPACE.section, gap: SPACE.section },
  header: { gap: SPACE.hair },
  footer: { paddingTop: SPACE.stack, borderTopWidth: BORDER.rest },
  section: { gap: SPACE.stack },
  close: {
    minHeight: TOUCH.default,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SIZE.pillPadX,
  },
});
