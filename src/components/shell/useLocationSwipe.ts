/**
 * Swipe between places on a weather page: left = the next page of the pager,
 * right = the previous one, stopping at either end (the web's
 * `useLocationSwipe`). The rule for what counts is the web's `classifySwipe`
 * (60 dp, clearly horizontal).
 *
 * Built on React Native's responder system, not a gesture library:
 * - it only claims a move that is already clearly sideways, so vertical
 *   scrolling never pages;
 * - it hands the touch back whenever a scroll view asks for it, so a
 *   sideways strip (the hourly forecast) scrolls instead of paging.
 */

import { useEffect, useMemo, useRef } from "react";
import { PanResponder, type GestureResponderHandlers } from "react-native";

import { neighbour, pagerIndex } from "@/shared/location-pager";
import { SWIPE_DOMINANCE_RATIO, classifySwipe } from "@/shared/swipe";
import { pageForPathname } from "@/shell/routes";

/** Sideways travel, in dp, before the page claims a move at all. */
export const SWIPE_CLAIM_DP = 12;

/** Whether a move so far is sideways enough for the page to claim it. */
export function shouldClaimSwipe(dx: number, dy: number): boolean {
  return (
    Math.abs(dx) > SWIPE_CLAIM_DP &&
    Math.abs(dx) > SWIPE_DOMINANCE_RATIO * Math.abs(dy)
  );
}

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

export function useLocationSwipe(
  pathname: string,
  sequence: readonly string[],
  goTo: (page: string) => void,
  enabled: boolean,
): GestureResponderHandlers | undefined {
  // Read the latest values at gesture time without rebuilding the responder.
  const latest = useRef({ pathname, sequence, goTo });
  useEffect(() => {
    latest.current = { pathname, sequence, goTo };
  }, [pathname, sequence, goTo]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) =>
          g.numberActiveTouches === 1 && shouldClaimSwipe(g.dx, g.dy),
        onPanResponderTerminationRequest: () => true,
        onPanResponderRelease: (_e, g) => {
          const { pathname: p, sequence: s, goTo: go } = latest.current;
          const target = swipeTarget(p, s, g.dx, g.dy);
          if (target) go(target);
        },
      }),
    [],
  );

  return enabled && sequence.length > 1 ? responder.panHandlers : undefined;
}
