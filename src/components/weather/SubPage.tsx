/**
 * The frame for a place's sub-page (the agriculture page): the sky, the top
 * row (Back, the trail, Settings) and the page title, exactly as the place's
 * Forecast and Atmosphere pages draw theirs (issue #79), inside the same
 * WeatherScroll (gutter, safe areas, the bottom bar's clearance).
 *
 * Loading and failure faces for a sub-page are here too, so a route never shows
 * a blank screen: bars in the shape of the page, or what happened and "Try
 * again", with Back still reachable.
 */

import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { ChevronLeftIcon } from "@/components/icons/Icon";
import { type SkyFamily } from "@/shared/hero";
import { type TrailItem } from "@/shared/place-trail";
import { RADIUS, SIZE, SPACE, withAlpha } from "@/theme/mzizi";
import { NEUTRAL_SKY, SKY_FG, SKY_FG_DIM } from "@/theme/sky";

import { PillButton } from "./PillButton";
import { Bar, ShimmerProvider } from "./Shimmer";
import { RoundControl } from "./RoundControl";
import { HeroTopRow } from "./SkyHero";
import { openSettings } from "./navigation";
import { WeatherScroll } from "./WeatherScroll";
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
  /** The sky to paint: the place's, when known; else a neutral day. */
  family?: SkyFamily;
};

export function SubPage({
  trail,
  title,
  subtitle,
  onBack,
  onHome,
  children,
  headerExtra,
  family = NEUTRAL_SKY,
}: SubPageProps) {
  // On the sky with the sky's top row, as the Forecast and Atmosphere pages
  // are, so a place's pages read as one section (issue #79).
  return (
    <WeatherScroll family={family}>
      <HeroTopRow
        name={title}
        trail={trail}
        onHome={onHome}
        leading={<SkyBack onBack={onBack} />}
        onSettings={openSettings}
      />
      <View style={styles.title}>
        <WxText
          type="h3"
          weight={700}
          family="serif"
          color={SKY_FG}
          accessibilityRole="header"
        >
          {title}
        </WxText>
        {subtitle ? (
          <WxText type="body" color={SKY_FG_DIM}>
            {subtitle}
          </WxText>
        ) : null}
        {headerExtra}
      </View>
      {children}
    </WeatherScroll>
  );
}

/** The sky's Back, for every face of a sub-page. */
function SkyBack({ onBack }: { onBack: () => void }) {
  return (
    <RoundControl label="Back" onPress={onBack} testID="back-control">
      <ChevronLeftIcon size={SIZE.iconMd} color={SKY_FG} />
    </RoundControl>
  );
}

/**
 * Bars in the shape of a sub-page (a title, a subtitle, three cards), on the
 * same sky and top row as the loaded page, so nothing jumps when it arrives.
 */
export function SubPageLoading({ onBack }: { onBack: () => void }) {
  const tint = withAlpha(SKY_FG, 0.18);
  return (
    <WeatherScroll family={NEUTRAL_SKY}>
      <HeroTopRow
        name="this page"
        leading={<SkyBack onBack={onBack} />}
        onSettings={openSettings}
      />
      <ShimmerProvider>
        <View
          style={styles.title}
          accessible
          accessibilityLabel="Loading"
          accessibilityState={{ busy: true }}
          testID="subpage-loading"
        >
          <Bar color={tint} width="60%" height={SIZE.iconMd * 2} />
          <Bar color={tint} width="40%" height={SIZE.iconMd} />
          {[0, 1, 2].map((i) => (
            <Bar
              key={i}
              color={tint}
              width="100%"
              height={SIZE.insightMin}
              radius={RADIUS.card}
            />
          ))}
        </View>
      </ShimmerProvider>
    </WeatherScroll>
  );
}

/**
 * What happened and "Try again", with Back still reachable, on the sky. It
 * scrolls, as the page does: at the largest text size on a small phone the
 * message can be taller than the screen.
 */
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
  return (
    <WeatherScroll family={NEUTRAL_SKY}>
      <HeroTopRow
        name="this page"
        leading={<SkyBack onBack={onBack} />}
        onSettings={openSettings}
      />
      <View style={styles.title} testID="subpage-error">
        <WxText
          type="h4"
          weight={600}
          family="serif"
          color={SKY_FG}
          accessibilityRole="header"
        >
          {title}
        </WxText>
        <WxText type="body" color={SKY_FG_DIM}>
          {message}
        </WxText>
        <PillButton label="Try again" onPress={onRetry} />
      </View>
    </WeatherScroll>
  );
}

const styles = StyleSheet.create({
  title: { gap: SPACE.snug },
});
