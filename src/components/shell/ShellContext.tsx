/**
 * What the shell tells a screen: how much room to leave at the bottom for the
 * floating bar (0 where the bar is not drawn), and the swipe handlers that
 * page between places. Outside the shell (tests, a screen rendered alone) it
 * is "no bar, no swipe", so every screen still renders on its own.
 */

import { createContext, useContext } from "react";
import { type GestureResponderHandlers } from "react-native";

export type ShellValue = {
  /** Bottom space the page leaves for the bar, in dp (0 when hidden). */
  clearance: number;
  /** Swipe left / right between places; undefined when there is no pager. */
  swipeHandlers?: GestureResponderHandlers;
};

export const ShellContext = createContext<ShellValue>({ clearance: 0 });

export function useShell(): ShellValue {
  return useContext(ShellContext);
}
