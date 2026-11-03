/**
 * What the Weather tab is standing in with: the name of the default city it
 * shows when it has no fix of the person's own (location off, never allowed,
 * no fix), else null. The bottom bar's My Location chip reads it, so it never
 * says "My Location" over a place that is not theirs (issue #66).
 *
 * In memory only: it describes the screen now, not a preference.
 */

import { useSyncExternalStore } from "react";

let standIn: string | null = null;
const listeners = new Set<() => void>();

export function setHomeStandIn(name: string | null): void {
  const next = name && name.trim() ? name.trim() : null;
  if (next === standIn) return;
  standIn = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const read = () => standIn;

/** The default city the Weather tab shows instead of the person's place. */
export function useHomeStandIn(): string | null {
  return useSyncExternalStore(subscribe, read, read);
}
