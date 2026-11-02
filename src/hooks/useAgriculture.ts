/**
 * Farm weather for a place and the user's crops, loaded once for whichever
 * screen asks (the snapshot card on the location page, or the agriculture page,
 * which also needs the data for its charts and calendar).
 */

import { useCallback } from "react";

import { type AgricultureResult, fetchAgriculture } from "@/api/agriculture";
import { type PlaceInfo } from "@/shared/place-info";

import { type RemoteState, useWorkerData } from "./useWorkerData";

export type AgricultureState = RemoteState<AgricultureResult> & {
  reload: () => void;
};

export function useAgriculture(
  place: PlaceInfo,
  crops: readonly string[],
): AgricultureState {
  const cropKey = crops.join(",");
  const { slug, lat, lon, country } = place;
  const load = useCallback(
    (signal: AbortSignal) =>
      fetchAgriculture(
        { slug, lat, lon, country },
        cropKey ? cropKey.split(",") : [],
        signal,
      ),
    [slug, lat, lon, country, cropKey],
  );
  return useWorkerData(load, true);
}
