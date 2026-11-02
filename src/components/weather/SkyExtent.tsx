/**
 * Keeps a heading that is drawn on the sky ON the sky (issue #61). The sky is
 * one screen tall (skyReach), so a heading low on the page, the tile grid's
 * "Conditions", could fall where it fades to the page colour, and no single
 * text colour is legible on both. A heading wrapped in `OnSky` reports how
 * far down it ends; WeatherScroll grows the sky past it before the fade, so
 * the heading can always use the sky foreground (white, 4.5:1 on every sky).
 */

import {
  type ComponentRef,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useRef,
} from "react";
import { View } from "react-native";

export type SkyExtentValue = {
  /** The scroll content, to measure against. */
  content: { current: ComponentRef<typeof View> | null };
  /** The sky must reach at least this far down the content, in dp. */
  extendTo: (bottom: number) => void;
};

export const SkyExtentContext = createContext<SkyExtentValue | null>(null);

export function OnSky({ children }: { children: ReactNode }) {
  const sky = useContext(SkyExtentContext);
  const ref = useRef<ComponentRef<typeof View>>(null);
  const onLayout = useCallback(() => {
    const node = ref.current;
    const content = sky?.content.current;
    if (!node || !content) return;
    node.measureLayout(
      content,
      (_x, y, _w, h) => sky.extendTo(y + h),
      () => undefined,
    );
  }, [sky]);
  return (
    <View ref={ref} onLayout={onLayout} testID="on-sky">
      {children}
    </View>
  );
}
