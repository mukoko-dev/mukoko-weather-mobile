/**
 * A region of the weather page where a sideways drag belongs to the content,
 * not to the place swipe: the hourly strip, a chart being scrubbed. The web's
 * `[data-no-swipe]`. A touch that starts inside tells the page's SwipeFrame
 * to ignore the gesture it is part of. Outside the shell it is a plain View.
 */

import { type ReactNode } from "react";
import { View, type ViewProps } from "react-native";

import { useShell } from "./ShellContext";

export function NoSwipeZone({
  children,
  ...rest
}: ViewProps & { children: ReactNode }) {
  const { markNoSwipe } = useShell();
  return (
    <View {...rest} onTouchStart={markNoSwipe}>
      {children}
    </View>
  );
}
