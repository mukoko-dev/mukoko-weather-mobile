/**
 * The two notices above the page content (the web's `FrostAlertBanner` and
 * `WeatherUnavailableBanner`).
 *
 * - Frost: a cold-blue edge and tint by risk (moderate, high, severe), the
 *   title names the level ("Frost Warning - SEVERE"), so colour is never the
 *   only signal. Announced assertively, as a safety notice.
 * - Weather unavailable: shown when every provider failed and the page shows a
 *   seasonal estimate. Polite, informational, with "Refresh now".
 * - Saved forecast: the Worker could not be reached and the page shows the
 *   copy kept on this phone, with its age and "Try again".
 *
 * Both sit on an opaque card colour with the tint over it, so the text holds
 * 4.5:1 whatever sky is behind the banner.
 */

import { type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { SnowflakeIcon } from "@/components/icons/Icon";
import { TriangleAlertIcon } from "@/components/icons/CardIcons";
import { usePageColors } from "@/hooks/usePageColors";
import { type FrostAlert } from "@/shared/weather";
import {
  BORDER,
  MINERAL_EDGE,
  RADIUS,
  SIZE,
  SPACE,
  TOUCH,
  withAlpha,
} from "@/theme/mzizi";
import { frostColor } from "@/theme/weather-scales";

import { WxText } from "./WxText";

/** How strongly the banner's colour tints its card (the web: 15% frost, 10% warning). */
export const BANNER_TINT = { frost: 0.15, warning: 0.1 } as const;

/** The frost banner's title: the level in words and capitals. */
export function frostTitle(alert: Pick<FrostAlert, "risk">): string {
  return `Frost ${alert.risk === "severe" ? "Warning" : "Advisory"} — ${alert.risk.toUpperCase()}`;
}

function Banner({
  edge,
  tint,
  icon,
  children,
  testID,
  live,
  role,
}: {
  edge: string;
  tint: number;
  icon: ReactNode;
  children: ReactNode;
  testID: string;
  live: "assertive" | "polite";
  role?: "alert";
}) {
  const { colors } = usePageColors();
  return (
    <View
      testID={testID}
      accessibilityRole={role}
      accessibilityLiveRegion={live}
      style={[
        styles.banner,
        { backgroundColor: colors.card, borderColor: edge },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: withAlpha(edge, tint) },
        ]}
      />
      <View style={styles.icon}>{icon}</View>
      <View style={styles.text}>{children}</View>
    </View>
  );
}

export function FrostAlertBanner({ alert }: { alert: FrostAlert }) {
  const { colors, scheme } = usePageColors();
  const edge = frostColor(alert.risk, scheme);
  return (
    <Banner
      testID="frost-banner"
      edge={edge}
      tint={BANNER_TINT.frost}
      live="assertive"
      role="alert"
      icon={<SnowflakeIcon size={SIZE.iconMd} color={colors.textPrimary} />}
    >
      <WxText
        type="body"
        weight={600}
        color={colors.textPrimary}
        accessibilityRole="header"
      >
        {frostTitle(alert)}
      </WxText>
      <WxText type="body" color={colors.textSecondary}>
        {alert.message}
      </WxText>
    </Banner>
  );
}

export function WeatherUnavailableBanner({
  onRefresh,
}: {
  onRefresh?: () => void | Promise<void>;
}) {
  const { colors, scheme } = usePageColors();
  // The web's `warmth` is the gold mineral.
  const edge = MINERAL_EDGE.gold[scheme === "dark" ? "dark" : "light"];
  return (
    <Banner
      testID="unavailable-banner"
      edge={edge}
      tint={BANNER_TINT.warning}
      live="polite"
      icon={<TriangleAlertIcon size={SIZE.iconMd} color={colors.textPrimary} />}
    >
      <WxText
        type="body"
        weight={600}
        color={colors.textPrimary}
        accessibilityRole="header"
      >
        Live weather data temporarily unavailable
      </WxText>
      <WxText type="body" color={colors.textSecondary}>
        Our weather providers are not responding. Showing seasonal estimates for
        this location.
      </WxText>
      {onRefresh ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh now"
          onPress={() => void onRefresh()}
          style={({ pressed }) => [
            styles.refresh,
            {
              borderColor: edge,
              borderWidth: pressed ? BORDER.active : BORDER.rest,
            },
          ]}
        >
          <WxText type="body" weight={600} color={colors.textPrimary}>
            Refresh now
          </WxText>
        </Pressable>
      ) : null}
    </Banner>
  );
}

/**
 * The page is drawing the forecast kept on this phone because the Worker could
 * not be reached (issue #69): the web's "Couldn't refresh the weather for X.
 * Showing what is saved on this device", with its age and "Try again". When
 * the copy is over an hour old its "now" is the forecast for this hour, and it
 * says so.
 */
export function SavedForecastBanner({
  placeName,
  updated,
  forecastOnly,
  reason,
  onRetry,
}: {
  placeName: string;
  /** "Updated 3 h ago". */
  updated: string;
  /** The conditions are the forecast for this hour, not a reading. */
  forecastOnly: boolean;
  /** Why it could not refresh, by cause (src/api/failure.ts). */
  reason: string;
  onRetry?: () => void;
}) {
  const { colors, scheme } = usePageColors();
  const edge = MINERAL_EDGE.gold[scheme === "dark" ? "dark" : "light"];
  return (
    <Banner
      testID="saved-forecast-banner"
      edge={edge}
      tint={BANNER_TINT.warning}
      live="polite"
      icon={<TriangleAlertIcon size={SIZE.iconMd} color={colors.textPrimary} />}
    >
      <WxText
        type="body"
        weight={600}
        color={colors.textPrimary}
        accessibilityRole="header"
      >
        {`Couldn't refresh the weather for ${placeName}`}
      </WxText>
      <WxText type="body" color={colors.textSecondary}>
        {`Showing what is saved on this device. ${updated}.${
          forecastOnly ? " Conditions are the forecast for this hour." : ""
        }`}
      </WxText>
      <WxText type="body" color={colors.textSecondary}>
        {reason}
      </WxText>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.refresh,
            {
              borderColor: edge,
              borderWidth: pressed ? BORDER.active : BORDER.rest,
            },
          ]}
        >
          <WxText type="body" weight={600} color={colors.textPrimary}>
            Try again
          </WxText>
        </Pressable>
      ) : null}
    </Banner>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    gap: SPACE.cozy,
    borderRadius: RADIUS.card,
    borderWidth: BORDER.rest,
    padding: SPACE.card,
    overflow: "hidden",
  },
  icon: { paddingTop: SPACE.hair },
  text: { flex: 1, minWidth: 0, gap: SPACE.hair },
  refresh: {
    alignSelf: "flex-start",
    minHeight: TOUCH.min,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
    paddingHorizontal: SIZE.pillPadX,
    marginTop: SPACE.snug,
  },
});
