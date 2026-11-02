/**
 * Where the weather cards send a person. One place, so a route is spelled once.
 */

import { router } from "expo-router";

/** The Weather tab: "Home" in the trail. */
export function goHome() {
  router.navigate("/");
}

/** A place's agriculture page. */
export function openAgriculture(slug: string) {
  router.push(`/location/${encodeURIComponent(slug)}/agriculture`);
}
