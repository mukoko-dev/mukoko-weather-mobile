/**
 * The "About {place}" card (the web's Location info card plus
 * `PlaceKnowledgeRows`): the facts the app holds about the place (country,
 * province, elevation, coordinates, address, the season), then what the
 * Worker's place profile adds: climate zone, what is typical this month, the
 * next season and the crop calendar.
 *
 * Never invented: a row with no value is left out, a place with no crop
 * calendar names no crops (it shows an "estimated" growing window instead), and
 * anything derived or unverified says "estimated". The facts show at once; the
 * profile rows follow when the profile arrives. If the profile cannot be read
 * the card says so and offers "Try again" instead of leaving a silent gap.
 */

import { StyleSheet, View } from "react-native";

import { usePageColors } from "@/hooks/usePageColors";
import { usePlaceProfile } from "@/hooks/usePlaceProfile";
import { locationMonth } from "@/shared/agriculture";
import {
  type AboutRow,
  type PlaceInfo,
  aboutRows,
  countryLabel,
} from "@/shared/place-info";
import { profileRows } from "@/shared/place-knowledge";
import { resolveSeason } from "@/shared/season";
import { BORDER, SPACE } from "@/theme/mzizi";

import { PillButton } from "./PillButton";
import { CardHeading, CardNote, PlaceCard } from "./PlaceCard";
import { CardLoading } from "./RemoteStates";
import { WxText } from "./WxText";

/** A label at the left and its value at the right; both wrap at large text sizes. */
export function InfoRow({ label, value }: AboutRow) {
  const { colors } = usePageColors();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={styles.row}
    >
      <WxText type="body" color={colors.textSecondary} style={styles.label}>
        {label}
      </WxText>
      <WxText
        type="body"
        weight={600}
        color={colors.textPrimary}
        align="right"
        style={styles.value}
      >
        {value}
      </WxText>
    </View>
  );
}

export type AboutPlaceCardProps = {
  place: PlaceInfo;
  /** The terrain height the forecast used, for a place with no stored height. */
  forecastElevation?: number | null;
  now: Date;
  utcOffsetSeconds?: number;
};

export function AboutPlaceCard({
  place,
  forecastElevation,
  now,
  utcOffsetSeconds,
}: AboutPlaceCardProps) {
  const { colors } = usePageColors();
  const profile = usePlaceProfile(place);
  const settled = profile.status !== "loading";
  const month = locationMonth(utcOffsetSeconds, now.getTime());
  const season = resolveSeason(
    profile.status === "ready" ? profile.data : null,
    month,
    place.lat,
  );
  const facts = aboutRows({
    place,
    countryName: countryLabel(place.country),
    season,
    forecastElevation,
  }).filter((row) => settled || row.label !== "Season");
  const knowledge = profile.status === "ready" ? profileRows(profile.data) : [];

  return (
    <PlaceCard testID="about-card">
      <CardHeading>{`About ${place.name}`}</CardHeading>
      <View style={styles.rows}>
        {facts.map((row) => (
          <InfoRow key={row.label} {...row} />
        ))}
      </View>
      {profile.status === "loading" ? (
        <CardLoading what="climate and crop details" />
      ) : null}
      {knowledge.length > 0 ? (
        <View
          testID="place-knowledge"
          style={[styles.knowledge, { borderTopColor: colors.border }]}
        >
          {knowledge.map((row) => (
            <InfoRow key={row.label} {...row} />
          ))}
        </View>
      ) : null}
      {profile.status === "unavailable" ? (
        <View style={styles.failed} testID="place-knowledge-failed">
          <CardNote>
            Climate and crop details for this place did not load.
          </CardNote>
          <PillButton
            label="Try again"
            variant="outline"
            onPress={profile.reload}
          />
        </View>
      ) : null}
    </PlaceCard>
  );
}

const styles = StyleSheet.create({
  rows: { gap: SPACE.snug },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    columnGap: SPACE.stack,
    rowGap: SPACE.hair,
  },
  label: { flexShrink: 0 },
  value: { flexShrink: 1, flexGrow: 1 },
  knowledge: {
    gap: SPACE.snug,
    borderTopWidth: BORDER.rest,
    paddingTop: SPACE.snug,
  },
  failed: { gap: SPACE.snug },
});
