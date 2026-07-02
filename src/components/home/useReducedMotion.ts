/**
 * useReducedMotion — tracks the OS "reduce motion" accessibility setting.
 *
 * Mirrors the web app's `prefers-reduced-motion` gate. When true, the hero
 * background renders a static gradient instead of the animated drift, per
 * Mzizi motion doctrine (reduced-motion fallback = 0ms / no animation).
 *
 * Defaults to `false` and updates once `AccessibilityInfo` resolves, then
 * stays live via the `reduceMotionChanged` event. `react-native-web` backs
 * this with `matchMedia('(prefers-reduced-motion)')`, so it works on web too.
 */

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((value) => {
        if (mounted) setReduced(!!value);
      })
      .catch(() => {
        /* setting unavailable — keep motion enabled */
      });

    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (value) =>
      setReduced(!!value),
    );

    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  return reduced;
}
