/**
 * ConditionHero — the current-conditions hero with a subtle, condition-aware
 * animated background.
 *
 * A lightweight background (two soft mineral "orbs" that drift + breathe over
 * a low-alpha wash) sits behind the big temperature. The mood is chosen from
 * the current WMO weather code via `heroMoodFor`; colours come from the active
 * Mzizi palette via `moodColors`. No new native deps — pure React Native
 * `Animated` (opacity + transform, native-driver) plus layered Views. When the
 * OS "reduce motion" setting is on, the orbs render static (Mzizi reduced-
 * motion doctrine).
 *
 * We intentionally do NOT wrap in `BaobabCard` here: the card's solid surface
 * would hide the wash. Instead we replicate the baobab chrome (radius, border,
 * shadow) with `overflow: hidden` so the background clips to the card.
 */

import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { type CurrentConditions } from '@/api/weather';
import { RADIUS, SPACING } from '@/brand/tokens';
import { BrandText } from '@/components/BrandText';
import { WeatherIcon } from '@/components/WeatherIcon';
import { usePalette } from '@/hooks/usePalette';
import { feelsLikeContext } from '@/shared';

import { heroMoodFor, moodColors } from './condition-theme';
import { useReducedMotion } from './useReducedMotion';

// Mzizi motion tokens (src: get_brand_tokens('motion')).
const EASE_ENTRANCE = Easing.bezier(0, 0, 0.2, 1); // --motion-ease-entrance
const EASE_STANDARD = Easing.bezier(0.4, 0, 0.2, 1); // --motion-ease-standard
const DURATION_EMPHASIS = 350; // --motion-duration-emphasis
// Ambient drift is a slow, non-UI loop — longer than any interaction token.
const AMBIENT_MS = 7000;

export type ConditionHeroProps = {
  current: CurrentConditions;
  /** Daytime? Flips clear/partly moods between warm glow and night wash. */
  isDay?: boolean;
};

export function ConditionHero({ current, isDay = true }: ConditionHeroProps) {
  const palette = usePalette();
  const reduced = useReducedMotion();

  const mood = heroMoodFor(current.weatherCode, isDay);
  const colors = moodColors(mood, palette);

  const hasTemp = current.temperature !== null && current.temperature !== undefined;
  const hasFeels = current.feelsLike !== null && current.feelsLike !== undefined;

  // Ambient orb drift (0 <-> 1), and a one-shot content entrance.
  // Held in state (stable instances) rather than refs so they are not read
  // as refs during render — pure Animated.Value math, no re-renders.
  const [drift] = useState(() => new Animated.Value(0));
  const [entrance] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduced) {
      drift.setValue(0.5);
      entrance.setValue(1);
      return;
    }

    Animated.timing(entrance, {
      toValue: 1,
      duration: DURATION_EMPHASIS,
      easing: EASE_ENTRANCE,
      useNativeDriver: true,
    }).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: AMBIENT_MS,
          easing: EASE_STANDARD,
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: AMBIENT_MS,
          easing: EASE_STANDARD,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, drift, entrance]);

  const orbATranslate = drift.interpolate({ inputRange: [0, 1], outputRange: [-14, 14] });
  const orbBTranslate = drift.interpolate({ inputRange: [0, 1], outputRange: [12, -12] });
  const orbScale = drift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  const contentStyle = {
    opacity: entrance,
    transform: [
      {
        translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
      },
    ],
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.surface,
          borderColor: palette.primary + '40',
        },
      ]}>
      {/* Decorative animated background — never intercepts touches. */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.base }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <Animated.View
          style={[
            styles.orb,
            styles.orbA,
            {
              backgroundColor: colors.orbA,
              transform: [{ translateX: orbATranslate }, { scale: orbScale }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.orb,
            styles.orbB,
            {
              backgroundColor: colors.orbB,
              transform: [{ translateX: orbBTranslate }, { scale: orbScale }],
            },
          ]}
        />
      </View>

      <Animated.View style={[styles.content, contentStyle]}>
        <WeatherIcon code={current.weatherCode} isDay={isDay} variant="hero" />
        <BrandText variant="hero" tone="text">
          {hasTemp ? `${Math.round(current.temperature!)}°` : '—'}
        </BrandText>
        {current.description ? (
          <BrandText variant="subtitle" tone="textSecondary">
            {current.description}
          </BrandText>
        ) : null}
        {hasFeels && hasTemp ? (
          <BrandText variant="small" tone="textTertiary">
            {feelsLikeContext(current.feelsLike!, current.temperature!)} — feels like{' '}
            {Math.round(current.feelsLike!)}°
          </BrandText>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    borderWidth: 1,
    overflow: 'hidden',
    // Baobab shadow-sm equivalent.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  content: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
  },
  orb: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  orbA: {
    top: -70,
    left: -40,
  },
  orbB: {
    bottom: -80,
    right: -30,
  },
});
