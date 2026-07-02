/**
 * Loading skeleton for the location detail screen. Mirrors the real layout —
 * hero block, a row of hourly cells, a metric grid, and daily rows — so the
 * transition to loaded content doesn't jump.
 *
 * The shimmer is a slow opacity pulse driven by the native driver. When the OS
 * "reduce motion" preference is on it stays static at a steady opacity, per the
 * Mzizi motion tokens' reduced-motion fallback.
 */

import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { RADIUS, SPACING } from '@/brand/tokens';
import { BaobabCard } from '@/components/BaobabCard';
import { useReducedMotion } from '@/components/detail/useReducedMotion';
import { usePalette } from '@/hooks/usePalette';

function usePulse(reduced: boolean): Animated.Value {
  const [value] = useState(() => new Animated.Value(reduced ? 0.6 : 0.35));

  useEffect(() => {
    if (reduced) {
      value.setValue(0.6);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(value, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, value]);

  return value;
}

function Bar({ width, height, opacity }: { width: number | `${number}%`; height: number; opacity: Animated.Value }) {
  const palette = usePalette();
  return (
    <Animated.View
      style={{
        width,
        height,
        opacity,
        borderRadius: RADIUS.sm,
        backgroundColor: palette.surfaceDim,
      }}
    />
  );
}

export function DetailSkeleton() {
  const reduced = useReducedMotion();
  const opacity = usePulse(reduced);

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading weather">
      <BaobabCard style={styles.hero}>
        <Bar width={64} height={64} opacity={opacity} />
        <Bar width={120} height={48} opacity={opacity} />
        <Bar width={160} height={20} opacity={opacity} />
      </BaobabCard>

      <View style={styles.rowTrack}>
        {Array.from({ length: 5 }).map((_, i) => (
          <BaobabCard key={i} quiet padding={SPACING.sm} style={styles.cell}>
            <Bar width={32} height={12} opacity={opacity} />
            <Bar width={28} height={24} opacity={opacity} />
            <Bar width={30} height={12} opacity={opacity} />
          </BaobabCard>
        ))}
      </View>

      <View style={styles.grid}>
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={styles.gridRow}>
            <BaobabCard style={styles.metric}>
              <Bar width={'60%'} height={12} opacity={opacity} />
              <Bar width={'40%'} height={28} opacity={opacity} />
            </BaobabCard>
            <BaobabCard style={styles.metric}>
              <Bar width={'60%'} height={12} opacity={opacity} />
              <Bar width={'40%'} height={28} opacity={opacity} />
            </BaobabCard>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  rowTrack: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  cell: {
    minWidth: 68,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  grid: {
    gap: SPACING.sm,
  },
  gridRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  metric: {
    minHeight: 96,
    flexGrow: 1,
    flexBasis: 0,
    gap: SPACING.sm,
    justifyContent: 'center',
  },
});
