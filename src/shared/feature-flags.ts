/**
 * Feature flags, ported from mukoko-weather `src/lib/feature-flags.ts` for the
 * flags the app reads. Code-defined booleans, no SaaS.
 *
 * `shamwari_chat` is false on the web: the standalone chat is PAUSED, its page
 * 404s and every "Ask Shamwari" entry point is hidden. The app follows: the
 * Shamwari screen sends you home and nothing links to it while this is off.
 * Flip it to true here (and on the web) to bring Shamwari back.
 */

export const FLAGS = {
  shamwari_chat: false,
} as const;

export type FeatureFlag = keyof typeof FLAGS;

/** Whether a feature is on. */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FLAGS[flag];
}
