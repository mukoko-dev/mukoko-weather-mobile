/**
 * A place's agriculture page, `/location/<slug>/agriculture`: the farm
 * windows, crop advice, 16-day charts, crop calendar, the past 30 days against
 * normal and the El Niño outlook (the web's `/[location]/agriculture`). This
 * screen only reads the place and designs the states (loading, failure with a
 * way to try again, ready); everything on the page is `AgricultureScreen`.
 */

import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback } from "react";

import { failureMessage } from "@/api/failure";
import { fetchLocation } from "@/api/locations";
import { AgricultureScreen } from "@/components/weather/AgricultureScreen";
import { goHome } from "@/components/weather/navigation";
import { placeOfSummary } from "@/api/place";
import { SubPageError, SubPageLoading } from "@/components/weather/SubPage";
import { goBack, openSettings } from "@/components/weather/WeatherPage";
import { useWorkerData } from "@/hooks/useWorkerData";

export default function AgricultureRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const load = useCallback(
    (signal: AbortSignal) => fetchLocation(slug, signal),
    [slug],
  );
  const state = useWorkerData(load, Boolean(slug));

  let body;
  if (!slug) {
    body = (
      <SubPageError
        title="No place was chosen"
        message="Open a place first, then its agriculture page."
        onRetry={goBack}
        onBack={goBack}
      />
    );
  } else if (state.status === "loading") {
    body = <SubPageLoading onBack={goBack} />;
  } else if (state.status === "unavailable") {
    body = (
      <SubPageError
        title="This place did not load"
        message={failureMessage(state.error)}
        onRetry={state.reload}
        onBack={goBack}
      />
    );
  } else {
    body = (
      <AgricultureScreen
        place={placeOfSummary(state.data)}
        onBack={goBack}
        onHome={goHome}
        onPickCrops={openSettings}
      />
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: "Agriculture" }} />
      {body}
    </>
  );
}
