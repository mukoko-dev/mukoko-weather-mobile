/**
 * What the shell tells a screen: how much room to leave at the bottom for the
 * floating bar (0 where the bar is not drawn), and the swipe handlers that
 * page between places. Outside the shell (tests, a screen rendered alone) it
 * is "no bar, no swipe", so every screen still renders on its own.
 */

import { createContext, useContext } from "react";

import { type SwipeConfig } from "./useLocationSwipe";

export type ShellValue = {
  /** Bottom space the page leaves for the bar, in dp (0 when hidden). */
  clearance: number;
  /** Swipe left / right between places; undefined where it cannot page. */
  swipe?: SwipeConfig;
  /**
   * The page under any sheet or modal (the ⋯ menu, sign-in, the map): what
   * the bar and the menu act on.
   */
  basePath: string;
};

export const ShellContext = createContext<ShellValue>({
  clearance: 0,
  basePath: "/",
});

export function useShell(): ShellValue {
  return useContext(ShellContext);
}
