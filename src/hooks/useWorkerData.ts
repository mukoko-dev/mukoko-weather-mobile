/**
 * Load one thing from the weather Worker for a card: the three outcomes a card
 * designs for (loading, ready, unavailable), a `reload` for "Try again", and an
 * abort when the card goes away or the inputs change. Nothing is loaded while
 * `enabled` is false (a sheet that is closed asks for nothing).
 *
 * The answer belongs to the `load` it was fetched with. When the inputs change
 * (`load` is a new function: another place, another day) the card is `loading`
 * again at once, so a place never shows the last place's reading while its own
 * is on the way.
 *
 * `refreshKey` asks again without blanking the card: when it changes (the page
 * pulled a new forecast) the last answer stays on screen while the new one is
 * fetched, and stays if that fetch fails.
 */

import { useCallback, useEffect, useState } from "react";

export type RemoteState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "unavailable" };

type Load<T> = (signal: AbortSignal) => Promise<T>;

export function useWorkerData<T>(
  load: Load<T>,
  enabled: boolean,
  refreshKey?: unknown,
): RemoteState<T> & { reload: () => void } {
  const [held, setHeld] = useState<{
    load: Load<T>;
    state: RemoteState<T>;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const state: RemoteState<T> =
    held && held.load === load ? held.state : { status: "loading" };

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const data = await load(controller.signal);
        if (!controller.signal.aborted) {
          setHeld({ load, state: { status: "ready", data } });
        }
      } catch {
        if (controller.signal.aborted) return;
        // A refresh that fails keeps the answer this card already shows.
        setHeld((prev) =>
          prev && prev.load === load && prev.state.status === "ready"
            ? prev
            : { load, state: { status: "unavailable" } },
        );
      }
    })();
    return () => controller.abort();
  }, [load, enabled, attempt, refreshKey]);

  const reload = useCallback(() => {
    setHeld(null);
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, reload };
}
