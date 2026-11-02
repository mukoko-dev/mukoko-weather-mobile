/**
 * Where the weather cards send a person. One place, so a route is spelled once.
 */

import { router } from "expo-router";

/**
 * My Location: "Home" in the trail. Pops back to the home screen under the
 * place (expo-router's `navigate` would push a second home), as the shell's
 * bar does (src/shell/navigate.ts).
 */
export function goHome() {
  router.dismissTo("/");
}

/** A place's agriculture page. */
export function openAgriculture(slug: string) {
  router.push(`/location/${encodeURIComponent(slug)}/agriculture`);
}
