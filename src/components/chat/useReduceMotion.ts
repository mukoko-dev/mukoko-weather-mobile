/**
 * Tracks the OS "reduce motion" accessibility setting so animated chat chrome
 * (the typing indicator) can fall back to a static state. Mirrors the web app's
 * `prefers-reduced-motion` handling and the Mzizi motion doctrine
 * (reduced_motion_fallback = 0ms).
 */

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {
        /* default to motion enabled if the query fails */
      });

    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduceMotion;
}
