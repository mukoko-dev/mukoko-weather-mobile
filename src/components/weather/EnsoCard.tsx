/**
 * The El Niño / La Niña outlook card (the web's `EnsoOutlook`): the latest
 * phase, its strength, the ONI value with its season, the last few seasons and
 * region-aware impact lines for the place's country, from `GET /v1/enso`
 * (NOAA CPC's Oceanic Niño Index).
 *
 * ENSO is a seasonal climate driver, not a forecast for today, and the card
 * says so. Where the web hides the card when NOAA cannot be reached, this one
 * says that plainly and offers "Try again", so a missing card never looks like
 * a bug. States: loading, request failed, no reading, ready.
 *
 * The phase badge follows the temperature convention (warm for El Niño, cool
 * for La Niña) and always carries the phase name; strength is a word in an
 * outline, never a colour.
 */

import { useCallback } from "react";
import { StyleSheet, View } from "react-native";

import { fetchEnso } from "@/api/enso";
import { useFarmColors } from "@/hooks/useFarmColors";
import { usePageColors } from "@/hooks/usePageColors";
import { useWorkerData } from "@/hooks/useWorkerData";
import {
  ENSO_STRENGTH_LABEL,
  type EnsoPhase,
  ensoImpact,
  formatOni,
} from "@/shared/enso";
import { BORDER, RADIUS, SPACE } from "@/theme/mzizi";

import { CardBody, CardHeading, CardNote, PlaceCard } from "./PlaceCard";
import { PillButton } from "./PillButton";
import { CardFailed, CardLoading } from "./RemoteStates";
import { WxText } from "./WxText";

const TITLE = "El Niño / La Niña outlook";

export type EnsoCardProps = {
  lat: number;
  lon: number;
  /** ISO 3166-1 alpha-2, when the place knows it. */
  countryCode?: string;
};

function PhaseBadge({ phase }: { phase: EnsoPhase }) {
  const { colors } = usePageColors();
  const farm = useFarmColors();
  const fill =
    phase === "El Niño"
      ? farm.ensoWarm
      : phase === "La Niña"
        ? farm.ensoCool
        : colors.background;
  const text = phase === "Neutral" ? colors.textSecondary : farm.ensoFg;
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: fill,
          borderColor: phase === "Neutral" ? colors.border : fill,
        },
      ]}
    >
      <WxText type="bodySm" weight={600} color={text}>
        {phase}
      </WxText>
    </View>
  );
}

export function EnsoCard({ lat, lon, countryCode }: EnsoCardProps) {
  const { colors } = usePageColors();
  const load = useCallback((signal: AbortSignal) => fetchEnso(signal), []);
  const state = useWorkerData(load, true);

  let body;
  if (state.status === "loading") {
    body = <CardLoading what="the El Niño and La Niña outlook" />;
  } else if (state.status === "unavailable") {
    body = (
      <CardFailed
        title={TITLE}
        body="The outlook did not load. Mukoko could not be reached; check your connection, then try again."
        onRetry={state.reload}
      />
    );
  } else if (state.data.kind === "unavailable") {
    body = (
      <View style={styles.stack} testID="enso-unavailable">
        <CardHeading>{TITLE}</CardHeading>
        <CardBody>
          The latest reading from NOAA is not available right now. This is a
          seasonal outlook, so the weather above is not affected.
        </CardBody>
        <PillButton
          label="Try again"
          variant="outline"
          onPress={state.reload}
        />
      </View>
    );
  } else {
    const data = state.data.data;
    const impact = ensoImpact(data.phase, countryCode, lat, lon);
    body = (
      <>
        <CardHeading>{TITLE}</CardHeading>
        <View style={styles.badges}>
          <PhaseBadge phase={data.phase} />
          {data.strength ? (
            <View style={[styles.badge, { borderColor: colors.border }]}>
              <WxText type="bodySm" color={colors.textSecondary}>
                {ENSO_STRENGTH_LABEL[data.strength]}
              </WxText>
            </View>
          ) : null}
        </View>
        <CardNote>{`ONI ${formatOni(data.oni)} for ${data.season} ${data.year}`}</CardNote>
        {data.series.length > 0 ? (
          <View
            accessibilityRole="list"
            accessibilityLabel="Recent seasons"
            style={styles.badges}
          >
            {data.series.map((s) => (
              <View
                key={`${s.season}-${s.year}`}
                accessible
                accessibilityLabel={`${s.season} ${s.year}, ONI ${formatOni(s.oni)}`}
                style={[styles.chip, { backgroundColor: colors.background }]}
              >
                <WxText type="bodySm" color={colors.textTertiary}>
                  {`${s.season} ${s.year} ${formatOni(s.oni)}`}
                </WxText>
              </View>
            ))}
          </View>
        ) : null}
        <View style={styles.bullets}>
          {impact.map((line) => (
            <View key={line} style={styles.bullet}>
              <WxText type="body" color={colors.textSecondary}>
                •
              </WxText>
              <View style={styles.bulletText}>
                <CardBody>{line}</CardBody>
              </View>
            </View>
          ))}
        </View>
        <CardNote>{`Seasonal outlook, not a forecast for today. Source: ${data.source}.`}</CardNote>
      </>
    );
  }

  return <PlaceCard testID="enso-card">{body}</PlaceCard>;
}

const styles = StyleSheet.create({
  stack: { gap: SPACE.stack },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.snug },
  badge: {
    borderRadius: RADIUS.pill,
    borderWidth: BORDER.rest,
    paddingHorizontal: SPACE.stack,
    paddingVertical: SPACE.hair,
  },
  chip: {
    borderRadius: RADIUS.input,
    paddingHorizontal: SPACE.cozy,
    paddingVertical: SPACE.hair,
  },
  bullets: { gap: SPACE.snug },
  bullet: { flexDirection: "row", gap: SPACE.snug },
  bulletText: { flex: 1 },
});
