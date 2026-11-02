/**
 * The agriculture page for a place (the web's `/[location]/agriculture`): the
 * snapshot, Shamwari's briefing (an honest signed-out state while sign-in is
 * off), crop advice for the user's crops, the 16-day charts, the planting and
 * harvest calendar, the past 30 days against normal, and the El Niño outlook.
 *
 * The farm data is loaded once here and shared by the snapshot, the advice, the
 * charts and the calendar. When the Worker has no farm data, the snapshot says
 * why and the cards that depend on it are left out, as on the web; the ENSO
 * card does not depend on it and still shows.
 */

import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { useAgriculture } from "@/hooks/useAgriculture";
import { longitudeOffsetSeconds } from "@/shared/location-time";
import { useNow } from "@/hooks/useNow";
import { usePlaceProfile } from "@/hooks/usePlaceProfile";
import {
  cropAdvice,
  cropsFromPreferences,
  locationMonth,
} from "@/shared/agriculture";
import { type PlaceInfo, aboutElevation } from "@/shared/place-info";
import { type TrailItem } from "@/shared/place-trail";
import { resolveSeason } from "@/shared/season";
import { usePreferences } from "@/state/preferences";
import { SPACE } from "@/theme/mzizi";

import { AgricultureBriefing } from "./AgricultureBriefing";
import { AgricultureCharts } from "./AgricultureCharts";
import { AgricultureCropAdvice } from "./AgricultureCropAdvice";
import { AgricultureHistory } from "./AgricultureHistory";
import { AgricultureSnapshotView } from "./AgricultureSnapshot";
import { CropCalendarTable } from "./CropCalendarTable";
import { EnsoCard } from "./EnsoCard";
import { CardNote } from "./PlaceCard";
import { SeasonBadge } from "./SeasonBadge";
import { SubPage } from "./SubPage";

export type AgricultureScreenProps = {
  place: PlaceInfo;
  onBack: () => void;
  onHome: () => void;
  /** Opens Settings, where the person chooses what they farm. */
  onPickCrops: () => void;
};

export function AgricultureScreen({
  place,
  onBack,
  onHome,
  onPickCrops,
}: AgricultureScreenProps) {
  const now = useNow();
  const { activities } = usePreferences();
  const crops = useMemo(() => cropsFromPreferences(activities), [activities]);
  const state = useAgriculture(place, crops);
  const profile = usePlaceProfile(place);

  const ready =
    state.status === "ready" && state.data.kind === "ready"
      ? state.data.data
      : null;
  // The place's month: the farm answer's offset, else one estimated from the
  // longitude (as the API does), never the UTC clock.
  const month = locationMonth(
    ready?.utcOffsetSeconds ?? longitudeOffsetSeconds(place.lon),
    now.getTime(),
  );
  const advice = useMemo(
    () => (ready ? cropAdvice(crops, ready) : []),
    [ready, crops],
  );
  const attribution =
    ready?.attribution ??
    (state.status === "ready" && state.data.kind === "unavailable"
      ? state.data.attribution
      : null);

  const season = resolveSeason(
    profile.status === "ready" ? profile.data : null,
    month,
    place.lat,
  );
  const metres = aboutElevation(place, ready?.elevation);
  const subtitle = [place.province, metres !== null ? `${metres} m` : null]
    .filter(Boolean)
    .join(" · ");
  // The web's sub-page trail: Home / Place / this page.
  const trail: TrailItem[] = [
    { label: "Home", kind: "home" },
    { label: place.name, kind: "plain" },
    { label: "Agriculture", kind: "current" },
  ];

  return (
    <SubPage
      trail={trail}
      title={`${place.name} Agriculture`}
      subtitle={subtitle || undefined}
      onBack={onBack}
      onHome={onHome}
      headerExtra={
        profile.status === "loading" ? undefined : (
          <View style={styles.season}>
            <SeasonBadge resolved={season} tone="page" />
          </View>
        )
      }
    >
      <AgricultureSnapshotView place={place} state={state} variant="page" />
      <AgricultureBriefing placeName={place.name} />
      {ready ? (
        <>
          <AgricultureCropAdvice
            advice={advice}
            crops={crops}
            onPickCrops={onPickCrops}
          />
          <AgricultureCharts daily={ready.daily} />
          <CropCalendarTable calendar={ready.calendar} currentMonth={month} />
          <AgricultureHistory
            slug={place.slug}
            lat={place.lat}
            lon={place.lon}
            modelRain30dMm={ready.rain?.past30dMm ?? null}
          />
        </>
      ) : null}
      <EnsoCard lat={place.lat} lon={place.lon} countryCode={place.country} />
      {attribution ? <CardNote>{attribution}</CardNote> : null}
    </SubPage>
  );
}

const styles = StyleSheet.create({
  season: { alignItems: "flex-start", paddingTop: SPACE.snug },
});
