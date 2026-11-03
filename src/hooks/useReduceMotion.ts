/**
 * Tracks the OS "Reduce Motion" setting, live. Anything that moves (the
 * skeleton shimmer) stays still while it is on. One hook for the weather
 * screens; the Mzizi motion doctrine's reduced-motion fallback is no motion.
 */

import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduce(enabled);
      })
      .catch(() => {
        /* motion stays on if the query fails */
      });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduce,
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduce;
}
