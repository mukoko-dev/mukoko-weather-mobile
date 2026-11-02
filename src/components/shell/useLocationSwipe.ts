/**
 * Swipe between places on a weather page: left = the next page of the pager,
 * right = the previous one, stopping at either end (the web's
 * `useLocationSwipe`). What counts is the web's `classifySwipe` (60 dp,
 * clearly horizontal).
 *
 * Native gestures (react-native-gesture-handler), not the JS responder: on
 * iOS the page's vertical ScrollView starts its own pan after ~10 pt in any
 * direction and cancels JS touches, so a responder-based swipe would never
 * finish. The pan here runs beside the ScrollView's native gesture
 * (`simultaneousWith`), fails as soon as the finger moves 10 pt vertically,
 * and only activates in a direction that has a page to go to.
 */

import { useEffect, useRef } from "react";

import { neighbour, pagerIndex } from "@/shared/location-pager";
import { classifySwipe } from "@/shared/swipe";
import { pageForPathname } from "@/shell/routes";

/** Sideways travel, in dp, before the pan activates. */
export const SWIPE_ACTIVATE_DP = 12;
/** Vertical travel, in dp, that hands the gesture to scrolling. */
export const SWIPE_FAIL_Y_DP = 10;

/** The page a finished gesture goes to, or null. */
export function swipeTarget(
  pathname: string,
  sequence: readonly string[],
  dx: number,
  dy: number,
): string | null {
  const direction = classifySwipe(dx, dy);
  if (!direction) return null;
  const index = pagerIndex(pageForPathname(pathname), sequence);
  return neighbour(sequence, index, direction === "left" ? 1 : -1);
}

/**
 * The pan's `activeOffsetX`: the range of sideways travel that does NOT
 * activate it. Only directions with a page to go to activate; null when
 * neither has one (the pan is then off, and a sideways drag stays with
 * whatever is under the finger).
 */
export function swipeActiveOffsetX(
  pathname: string,
  sequence: readonly string[],
): number | [number, number] | null {
  const index = pagerIndex(pageForPathname(pathname), sequence);
  const next = neighbour(sequence, index, 1) !== null;
  const prev = neighbour(sequence, index, -1) !== null;
  if (next && prev) return [-SWIPE_ACTIVATE_DP, SWIPE_ACTIVATE_DP];
  if (next) return -SWIPE_ACTIVATE_DP; // left only: (-12, inf) does nothing
  if (prev) return SWIPE_ACTIVATE_DP; // right only: (-inf, 12) does nothing
  return null;
}

export type SwipeConfig = {
  activeOffsetX: number | [number, number];
  onSwipe: (dx: number, dy: number) => void;
};

/**
 * What the weather page's pan needs, or undefined where it cannot page. One
 * move at a time: a second swipe before the first page has arrived is
 * ignored, so a fast double swipe never repeats the same move.
 */
export function useLocationSwipe(
  pathname: string,
  sequence: readonly string[],
  goTo: (page: string) => void,
  enabled: boolean,
): SwipeConfig | undefined {
  const inFlight = useRef(false);
  useEffect(() => {
    inFlight.current = false;
  }, [pathname]);

  const activeOffsetX = enabled ? swipeActiveOffsetX(pathname, sequence) : null;
  if (activeOffsetX === null) return undefined;
  return {
    activeOffsetX,
    onSwipe: (dx, dy) => {
      if (inFlight.current) return;
      const target = swipeTarget(pathname, sequence, dx, dy);
      if (!target) return;
      inFlight.current = true;
      goTo(target);
    },
  };
}
