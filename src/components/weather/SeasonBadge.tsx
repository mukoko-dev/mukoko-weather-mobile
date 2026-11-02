/**
 * The season line at the foot of the Conditions card (the web's `SeasonBadge`
 * in `HourlyScrollCards`' footer): the local name first, then the English name
 * and a few words about the season. It wraps instead of truncating, so a
 * larger text size never cuts it off (Dynamic Type).
 *
 * The season comes from the place's profile (the Worker's compiled-in country
 * calendars, local names included), read in the PLACE's month. While the
 * profile loads the line is a bar of the same height, so the card does not
 * grow when it arrives; if the profile cannot be read, the hemisphere default
 * stands in. A season that is not a verified local calendar says "estimated".
 */

import { StyleSheet, View } from "react-native";

import { usePageColors } from "@/hooks/usePageColors";
import { usePlaceProfile } from "@/hooks/usePlaceProfile";
import { locationMonth } from "@/shared/agriculture";
import { type PlaceInfo } from "@/shared/place-info";
import {
  type ResolvedSeason,
  resolveSeason,
  seasonLine,
} from "@/shared/season";
import {
  BORDER,
  RADIUS,
  SPACE,
  TYPE,
  lineHeightOf,
  withAlpha,
} from "@/theme/mzizi";
import { SKY_FG, SKY_FG_DIM, SKY_SURFACE } from "@/theme/sky";

import { Bar, ShimmerProvider } from "./Shimmer";
import { WxText } from "./WxText";

/**
 * The line itself, for a season already worked out. `sky` is white on the
 * page sky (the Conditions card); `page` is the ordinary text colours on the
 * page background (the agriculture page).
 */
export function SeasonBadge({
  resolved,
  tone = "sky",
}: {
  resolved: ResolvedSeason;
  tone?: "sky" | "page";
}) {
  const { colors } = usePageColors();
  const onSky = tone === "sky";
  const line = seasonLine(resolved.season);
  const detail = [line.detail, resolved.estimated ? "estimated" : ""]
    .filter(Boolean)
    .join(" · ");
  return (
    <View
      testID="season-badge"
      accessible
      accessibilityLabel={`Season: ${line.title}${line.detail ? `. ${line.detail}` : ""}${resolved.estimated ? ". Estimated" : ""}`}
      style={[
        styles.badge,
        onSky
          ? {
              backgroundColor: withAlpha(SKY_FG, SKY_SURFACE.card.fill),
              borderColor: withAlpha(SKY_FG, SKY_SURFACE.card.border),
            }
          : {
              backgroundColor: withAlpha(colors.primary, 0.1),
              borderColor: withAlpha(colors.primary, 0.25),
            },
      ]}
    >
      <WxText
        type="body"
        weight={600}
        color={onSky ? SKY_FG : colors.textPrimary}
        align="center"
      >
        {line.title}
      </WxText>
      {detail ? (
        <WxText
          type="body"
          color={onSky ? SKY_FG_DIM : colors.textSecondary}
          align="center"
        >
          {detail}
        </WxText>
      ) : null}
    </View>
  );
}

/** The footer of the Conditions card: placeholder, then the badge. */
export function SeasonFooter({
  place,
  now,
  utcOffsetSeconds,
}: {
  place: PlaceInfo;
  now: Date;
  utcOffsetSeconds?: number;
}) {
  const profile = usePlaceProfile(place);
  if (profile.status === "loading") {
    return (
      <ShimmerProvider>
        <View
          testID="season-loading"
          accessible
          accessibilityLabel="Loading the season"
          accessibilityState={{ busy: true }}
          style={styles.loading}
        >
          <Bar
            color={withAlpha(SKY_FG, SKY_SURFACE.card.fill)}
            width="60%"
            height={Math.round(TYPE.body.size * 0.7)}
          />
        </View>
      </ShimmerProvider>
    );
  }
  const month = locationMonth(utcOffsetSeconds, now.getTime());
  const resolved = resolveSeason(
    profile.status === "ready" ? profile.data : null,
    month,
    place.lat,
  );
  return <SeasonBadge resolved={resolved} />;
}

const styles = StyleSheet.create({
  badge: {
    maxWidth: "100%",
    alignItems: "center",
    columnGap: SPACE.snug,
    paddingHorizontal: SPACE.stack,
    paddingVertical: SPACE.hair,
    borderRadius: RADIUS.input,
    borderWidth: BORDER.rest,
  },
  // A typical badge: two lines of body text, its padding and its border.
  loading: {
    minHeight: lineHeightOf("body") * 2 + SPACE.hair * 2 + BORDER.rest * 2,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
});
