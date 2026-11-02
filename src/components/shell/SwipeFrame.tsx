/**
 * The weather page's frame when it can swipe between places: a pan
 * (react-native-gesture-handler) around the page, running beside the
 * ScrollView's own native gesture, so vertical scrolling is untouched and a
 * sideways swipe pages (rules in useLocationSwipe).
 */

import { type ReactElement, type ReactNode } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import {
  GestureDetector,
  useNativeGesture,
  usePanGesture,
} from "react-native-gesture-handler";

import { SWIPE_FAIL_Y_DP, type SwipeConfig } from "./useLocationSwipe";

export type SwipeFrameProps = {
  swipe: SwipeConfig;
  style: StyleProp<ViewStyle>;
  /** The page's ScrollView: its native gesture runs with the swipe. */
  scroll: ReactElement;
  /** Anything else in the frame, drawn over the scroll view. */
  children?: ReactNode;
};

export function SwipeFrame({
  swipe,
  style,
  scroll,
  children,
}: SwipeFrameProps) {
  const scrollGesture = useNativeGesture({});
  const swipeGesture = usePanGesture({
    runOnJS: true,
    activeOffsetX: swipe.activeOffsetX,
    failOffsetY: [-SWIPE_FAIL_Y_DP, SWIPE_FAIL_Y_DP],
    simultaneousWith: scrollGesture,
    onDeactivate: (e) => {
      if (!e.canceled) swipe.onSwipe(e.translationX, e.translationY);
    },
  });
  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={style}>
        <GestureDetector gesture={scrollGesture}>{scroll}</GestureDetector>
        {children}
      </View>
    </GestureDetector>
  );
}
