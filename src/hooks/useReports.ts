/**
 * The community reports for a place: `off` while the switch is off (nothing is
 * requested), then loading, ready or failed. Upvoting counts a vote on screen
 * only after the server counted it.
 *
 * ONE copy per place, shared by every screen part that shows it (the lane's
 * pins and the reports card): one request per place however many parts ask,
 * an upvote or a reload seen by all of them, and a part never shows another
 * place's reports while its own load, fails or are off.
 */

import { useCallback, useEffect, useSyncExternalStore } from "react";

import {
  COMMUNITY_REPORTS_ENABLED,
  fetchReports,
  upvoteReport,
} from "@/api/reports";
import { type CommunityReport } from "@/shared/report-types";

export type ReportsStatus = "off" | "loading" | "ready" | "failed";

type Entry = {
  status: "loading" | "ready" | "failed";
  reports: CommunityReport[];
  /** When the list was asked for; an old one is asked for again. */
  at?: number;
};

/** Reports are about the last hours: a list older than this is asked again. */
export const REPORTS_FRESH_MS = 5 * 60_000;

const entries = new Map<string, Entry>();
const inFlight = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function set(slug: string, entry: Entry) {
  entries.set(slug, entry);
  emit();
}

/** Ask for a place's reports once; a second ask while one is out joins it. */
function load(slug: string, enabled: boolean, force = false): Promise<void> {
  const running = inFlight.get(slug);
  if (running && !force) return running;
  const prev = entries.get(slug);
  // A reload keeps what is on screen until the new list lands.
  if (!prev || prev.status === "failed") {
    set(slug, { status: "loading", reports: [] });
  }
  const p = fetchReports(slug, { enabled })
    .then((reports) => set(slug, { status: "ready", reports, at: Date.now() }))
    .catch(() => {
      const now = entries.get(slug);
      // A failed reload keeps the list it had; a failed first load says so.
      if (now?.status !== "ready") set(slug, { status: "failed", reports: [] });
    })
    .finally(() => {
      if (inFlight.get(slug) === p) inFlight.delete(slug);
    });
  inFlight.set(slug, p);
  return p;
}

/** Forget every place (tests). */
export function clearReportsStore() {
  entries.clear();
  inFlight.clear();
  emit();
}

const OFF: Entry & { status: ReportsStatus } = {
  status: "loading",
  reports: [],
};

export function useReports(
  slug: string | undefined,
  enabled: boolean = COMMUNITY_REPORTS_ENABLED,
): {
  status: ReportsStatus;
  reports: CommunityReport[];
  reload: () => void;
  upvote: (id: string) => Promise<boolean>;
} {
  const on = enabled && Boolean(slug);
  const entry = useSyncExternalStore(
    subscribe,
    () => (on && slug ? entries.get(slug) : undefined),
    () => undefined,
  );

  useEffect(() => {
    if (!on || !slug) return;
    const had = entries.get(slug);
    const stale =
      had?.status === "ready" && Date.now() - (had.at ?? 0) > REPORTS_FRESH_MS;
    if (!had || stale) void load(slug, enabled);
  }, [on, slug, enabled]);

  const reload = useCallback(() => {
    if (on && slug) void load(slug, enabled, true);
  }, [on, slug, enabled]);

  const upvote = useCallback(
    async (id: string) => {
      try {
        const counted = await upvoteReport(id, { enabled });
        const now = slug ? entries.get(slug) : undefined;
        if (counted && slug && now) {
          set(slug, {
            ...now,
            reports: now.reports.map((r) =>
              r.id === id ? { ...r, upvotes: r.upvotes + 1 } : r,
            ),
          });
        }
        return counted;
      } catch {
        return false;
      }
    },
    [enabled, slug],
  );

  if (!on) return { status: "off", reports: [], reload, upvote };
  const shown = entry ?? OFF;
  return { status: shown.status, reports: shown.reports, reload, upvote };
}
