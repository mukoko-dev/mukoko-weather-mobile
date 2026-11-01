/**
 * The current instant, refreshed every minute and when the app returns to the
 * foreground. The screens read "now" in the PLACE's time with the forecast's
 * UTC offset (src/shared/location-time.ts); this is only the instant.
 */

import { useEffect, useState } from "react";
import { AppState } from "react-native";

const MINUTE_MS = 60_000;

export function useNow(intervalMs: number = MINUTE_MS): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, intervalMs);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [intervalMs]);

  return now;
}
