/**
 * Farm weather for a place and the user's crops, loaded once for whichever
 * screen asks (the snapshot card on the location page, or the agriculture page,
 * which also needs the data for its charts and calendar): `fetchAgriculture`
 * shares one request and reuses a ready answer for a few minutes. A new
 * `refreshKey` (the page pulled a new forecast) asks again, past the reuse.
 */

import { useCallback, useEffect, useRef } from "react";

import { type AgricultureResult, fetchAgriculture } from "@/api/agriculture";
import { type PlaceInfo } from "@/shared/place-info";

import { type RemoteState, useWorkerData } from "./useWorkerData";

export type AgricultureState = RemoteState<AgricultureResult> & {
  reload: () => void;
};

export function useAgriculture(
  place: PlaceInfo,
  crops: readonly string[],
  refreshKey?: unknown,
): AgricultureState {
  const cropKey = crops.join(",");
  // Runs before the load below: a refresh after the first answer is fresh.
  const fresh = useRef(false);
  const seen = useRef(refreshKey);
  useEffect(() => {
    if (seen.current !== refreshKey) {
      seen.current = refreshKey;
      fresh.current = true;
    }
  }, [refreshKey]);
  const { slug, lat, lon, country } = place;
  const load = useCallback(
    (signal: AbortSignal) => {
      const asFresh = fresh.current;
      fresh.current = false;
      return fetchAgriculture(
        { slug, lat, lon, country },
        cropKey ? cropKey.split(",") : [],
        signal,
        { fresh: asFresh },
      );
    },
    [slug, lat, lon, country, cropKey],
  );
  return useWorkerData(load, true, refreshKey);
}
