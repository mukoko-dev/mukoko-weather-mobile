/**
 * Reports the OS "reduce motion" accessibility preference, and keeps it live if
 * the user toggles it while the screen is open. Detail-screen animations (the
 * loading skeleton pulse, content fade-in) consult this so they fall back to a
 * static presentation when motion is reduced — matching Mzizi's
 * `reduced_motion_fallback` on the motion tokens.
 */

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduced(value);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      setReduced(value);
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduced;
}
