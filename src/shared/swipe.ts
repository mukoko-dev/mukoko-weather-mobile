/**
 * Swipe classification, ported from mukoko-weather `src/lib/use-swipe.ts`
 * (`classifySwipe` and its thresholds) with the same rule: a swipe needs
 * 60 of travel and must be clearly horizontal. The DOM parts (touch handlers,
 * `[data-no-swipe]`) are the gesture code's job on a phone (useLocationSwipe).
 */

/** Minimum horizontal travel, in dp, before a gesture counts. */
export const SWIPE_MIN_DISTANCE_PX = 60;

/** The horizontal travel must exceed this multiple of the vertical travel. */
export const SWIPE_DOMINANCE_RATIO = 1.5;

export type SwipeDirection = "left" | "right";

/**
 * Classify a finished gesture from its total displacement. Null for short,
 * diagonal or vertical gestures. A left swipe has negative `dx`.
 */
export function classifySwipe(
  dx: number,
  dy: number,
  threshold: number = SWIPE_MIN_DISTANCE_PX,
): SwipeDirection | null {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (absX < threshold) return null;
  if (!(absX > SWIPE_DOMINANCE_RATIO * absY)) return null;
  return dx < 0 ? "left" : "right";
}
