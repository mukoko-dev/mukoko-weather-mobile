/**
 * Loading bars. One shared slow pulse drives every bar on the screen (so a
 * skeleton is one animation, not forty); under Reduce Motion nothing moves and
 * the bars sit at a steady opacity. A bar is a tint of the colour it is given,
 * so the same bar reads on the sky and on a card, in light and in dark.
 */

import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  Animated,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useReduceMotion } from "@/hooks/useReduceMotion";
import { RADIUS } from "@/theme/mzizi";

/** Pulse bounds and half-period, in the Mzizi emphasis motion range. */
const PULSE = { low: 0.35, high: 0.7, half: 700, still: 0.5 } as const;

const PulseContext = createContext<Animated.Value | null>(null);

export function ShimmerProvider({ children }: { children: ReactNode }) {
  const reduce = useReduceMotion();
  const [value] = useState(() => new Animated.Value(PULSE.still));

  useEffect(() => {
    if (reduce) {
      value.setValue(PULSE.still);
      return;
    }
    value.setValue(PULSE.low);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: PULSE.high,
          duration: PULSE.half,
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: PULSE.low,
          duration: PULSE.half,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, value]);

  return (
    <PulseContext.Provider value={value}>{children}</PulseContext.Provider>
  );
}

export type BarProps = {
  /** The bar's tint: the colour of the text it stands in for. */
  color: string;
  width: DimensionValue;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export function Bar({
  color,
  width,
  height,
  radius = RADIUS.sm,
  style,
}: BarProps) {
  const pulse = useContext(PulseContext);
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: color,
          opacity: pulse ?? PULSE.still,
        },
        style,
      ]}
    />
  );
}
