/**
 * Load one thing from the weather Worker for a card: the three outcomes a card
 * designs for (loading, ready, unavailable), a `reload` for "Try again", and an
 * abort when the card goes away or the inputs change. Nothing is loaded while
 * `enabled` is false (a sheet that is closed asks for nothing).
 */

import { useCallback, useEffect, useState } from "react";

export type RemoteState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "unavailable" };

export function useWorkerData<T>(
  load: (signal: AbortSignal) => Promise<T>,
  enabled: boolean,
): RemoteState<T> & { reload: () => void } {
  const [state, setState] = useState<RemoteState<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const data = await load(controller.signal);
        if (!controller.signal.aborted) setState({ status: "ready", data });
      } catch {
        if (!controller.signal.aborted) setState({ status: "unavailable" });
      }
    })();
    return () => controller.abort();
  }, [load, enabled, attempt]);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, reload };
}
