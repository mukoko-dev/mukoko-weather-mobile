/**
 * Opens a place's detail pages from the page's cards ("Full forecast", "24h
 * trends"). `undefined` for a place with no slug (a bare coordinate the API
 * has not named), so a card shows no link rather than a dead one.
 */

import { useRouter } from "expo-router";
import { useMemo } from "react";

import { locationSubHref } from "@/components/weather/location-routes";

export type LocationLinks = {
  openForecast: () => void;
  openAtmosphere: () => void;
};

export function useLocationLinks(
  slug: string | undefined,
): LocationLinks | undefined {
  const router = useRouter();
  return useMemo(
    () =>
      slug
        ? {
            openForecast: () => router.push(locationSubHref(slug, "forecast")),
            openAtmosphere: () =>
              router.push(locationSubHref(slug, "atmosphere")),
          }
        : undefined,
    [router, slug],
  );
}
