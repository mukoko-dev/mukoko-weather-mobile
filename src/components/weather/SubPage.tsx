/**
 * The frame for a place's sub-page (the agriculture page): the ordinary page
 * background, the SAME gutter and safe-area insets as the weather page (the one
 * `pagePadding` in WeatherScroll), a top row with Back and the trail, and the
 * page title. No sky: on the web a sub-page is a plain page under the header,
 * and the sky belongs to the place's own page.
 *
 * Loading and failure faces for a sub-page are here too, so a route never shows
 * a blank screen: bars in the shape of the page, or what happened and "Try
 * again", with Back still reachable.
 */

import { type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChevronLeftIcon } from "@/components/icons/Icon";
import { usePageColors } from "@/hooks/usePageColors";
import { type TrailItem } from "@/shared/place-trail";
import { BORDER, RADIUS, SIZE, SPACE, TOUCH } from "@/theme/mzizi";

import { PlaceTrail } from "./PlaceTrail";
import { PillButton } from "./PillButton";
import { CardBody, CardHeading } from "./PlaceCard";
import { Bar, ShimmerProvider } from "./Shimmer";
import { pagePadding } from "./WeatherScroll";
import { WxText } from "./WxText";

export type SubPageProps = {
  trail: TrailItem[];
  title: string;
  /** The line under the title (province, height, season). */
  subtitle?: string;
  onBack: () => void;
  onHome: () => void;
  children: ReactNode;
  /** Something under the subtitle (the season line). */
  headerExtra?: ReactNode;
};

export function SubPage({
  trail,
  title,
  subtitle,
  onBack,
  onHome,
  children,
  headerExtra,
}: SubPageProps) {
  const insets = useSafeAreaInsets();
  const { colors } = usePageColors();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
      >
        <View style={pagePadding(insets, false)}>
          <View style={styles.column}>
            <View style={styles.topRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                onPress={onBack}
                testID="back-control"
                style={[styles.back, { borderColor: colors.border }]}
              >
                <ChevronLeftIcon
                  size={SIZE.iconMd}
                  color={colors.textPrimary}
                />
              </Pressable>
              <View style={styles.trail}>
                <PlaceTrail
                  items={trail}
                  onHome={onHome}
                  color={colors.textTertiary}
                />
              </View>
            </View>
            <View style={styles.title}>
              <WxText
                type="h2"
                weight={600}
                family="serif"
                color={colors.textPrimary}
                accessibilityRole="header"
              >
                {title}
              </WxText>
              {subtitle ? (
                <WxText type="body" color={colors.textSecondary}>
                  {subtitle}
                </WxText>
              ) : null}
              {headerExtra}
            </View>
            {children}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/** Bars in the shape of a sub-page: a title, a subtitle, three cards. */
export function SubPageLoading({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { colors } = usePageColors();
  const tint = colors.border;
  return (
    <ShimmerProvider>
      <View
        style={[styles.root, { backgroundColor: colors.background }]}
        accessible
        accessibilityLabel="Loading"
        accessibilityState={{ busy: true }}
        testID="subpage-loading"
      >
        <View style={pagePadding(insets, false)}>
          <View style={styles.column}>
            <View style={styles.topRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                onPress={onBack}
                style={[styles.back, { borderColor: colors.border }]}
              >
                <ChevronLeftIcon
                  size={SIZE.iconMd}
                  color={colors.textPrimary}
                />
              </Pressable>
            </View>
            <Bar color={tint} width="60%" height={SIZE.iconMd * 2} />
            <Bar color={tint} width="40%" height={SIZE.iconMd} />
            <Bar
              color={tint}
              width="100%"
              height={SIZE.insightMin}
              radius={RADIUS.card}
            />
            <Bar
              color={tint}
              width="100%"
              height={SIZE.insightMin}
              radius={RADIUS.card}
            />
          </View>
        </View>
      </View>
    </ShimmerProvider>
  );
}

/** What happened and what to do, with Back still there. */
export function SubPageError({
  title,
  message,
  onRetry,
  onBack,
}: {
  title: string;
  message: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = usePageColors();
  return (
    <View
      style={[styles.root, { backgroundColor: colors.background }]}
      testID="subpage-error"
    >
      {/* Scrolls, as the page does: at the largest text size on a small phone
          the message can be taller than the screen, and "Try again" is the
          only way out of a failed load. */}
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
      >
        <View style={pagePadding(insets, false)}>
          <View style={styles.column}>
            <View style={styles.topRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                onPress={onBack}
                style={[styles.back, { borderColor: colors.border }]}
              >
                <ChevronLeftIcon
                  size={SIZE.iconMd}
                  color={colors.textPrimary}
                />
              </Pressable>
            </View>
            <CardHeading>{title}</CardHeading>
            <CardBody>{message}</CardBody>
            <PillButton label="Try again" onPress={onRetry} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  column: {
    width: "100%",
    maxWidth: SIZE.contentMax,
    alignSelf: "center",
    gap: SPACE.section,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.snug,
    paddingTop: SPACE.hair,
  },
  back: {
    width: TOUCH.min,
    height: TOUCH.min,
    borderRadius: RADIUS.pill,
    borderWidth: BORDER.rest,
    alignItems: "center",
    justifyContent: "center",
  },
  trail: { flex: 1, minWidth: 0 },
  title: { gap: SPACE.snug },
});
