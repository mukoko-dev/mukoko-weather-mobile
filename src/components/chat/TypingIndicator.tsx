/**
 * Three-dot "Shamwari is thinking" indicator shown while a reply is in flight.
 *
 * Uses the sodalite mineral (the AI / Shamwari surface colour). Animation
 * respects the OS reduce-motion setting — when reduced, the dots render static
 * at full opacity instead of pulsing. Announced to screen readers via
 * role="status".
 */

import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { SPACING } from '@/brand/tokens';
import { usePalette } from '@/hooks/usePalette';
import { useReduceMotion } from './useReduceMotion';

const DOTS = [0, 1, 2];
/** Mzizi motion: duration-emphasis (350ms) per half-cycle feels like breathing. */
const PULSE_MS = 350;
const STAGGER_MS = 140;

function Dot({ color, delay, animate }: { color: string; delay: number; animate: boolean }) {
  const value = useRef(new Animated.Value(animate ? 0.3 : 1)).current;

  useEffect(() => {
    if (!animate) {
      value.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, {
          toValue: 1,
          duration: PULSE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0.3,
          duration: PULSE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, delay, value]);

  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: color, opacity: value }]}
    />
  );
}

export function TypingIndicator() {
  const palette = usePalette();
  const reduceMotion = useReduceMotion();

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel="Shamwari is thinking">
      {DOTS.map((i) => (
        <Dot
          key={i}
          color={palette.sodalite}
          delay={i * STAGGER_MS}
          animate={!reduceMotion}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
