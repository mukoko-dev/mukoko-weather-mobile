/**
 * A place's stored knowledge (season, climate zone, crop calendar) for the
 * cards that read it. The request is shared and cached 30 minutes
 * (`src/api/profile.ts`), so the season line and the About card, which both
 * ask, cost one fetch.
 */

import { useCallback } from "react";

import { fetchPlaceProfile } from "@/api/profile";
import { type PlaceInfo } from "@/shared/place-info";
import { type PlaceProfile } from "@/shared/place-knowledge";

import { type RemoteState, useWorkerData } from "./useWorkerData";

export function usePlaceProfile(
  place: PlaceInfo,
): RemoteState<PlaceProfile> & { reload: () => void } {
  const { slug, lat, lon, country } = place;
  const load = useCallback(
    // The shared request ignores the abort signal on purpose: a card going
    // away must not cancel it for the next card.
    () => fetchPlaceProfile({ slug, lat, lon, country }),
    [slug, lat, lon, country],
  );
  return useWorkerData(load, true);
}
