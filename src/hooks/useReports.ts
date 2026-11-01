/**
 * The community reports for a place: `off` while the switch is off (nothing is
 * requested), then loading, ready or failed. Upvoting counts a vote on screen
 * only after the server counted it.
 */

import { useCallback, useEffect, useState } from "react";

import {
  COMMUNITY_REPORTS_ENABLED,
  fetchReports,
  upvoteReport,
} from "@/api/reports";
import { type CommunityReport } from "@/shared/report-types";

export type ReportsStatus = "off" | "loading" | "ready" | "failed";

export function useReports(
  slug: string | undefined,
  enabled: boolean = COMMUNITY_REPORTS_ENABLED,
): {
  status: ReportsStatus;
  reports: CommunityReport[];
  reload: () => void;
  upvote: (id: string) => Promise<boolean>;
} {
  const [status, setStatus] = useState<ReportsStatus>(
    enabled ? "loading" : "off",
  );
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled || !slug) {
      setStatus("off");
      return;
    }
    const controller = new AbortController();
    let alive = true;
    setStatus("loading");
    fetchReports(slug, { signal: controller.signal, enabled })
      .then((list) => {
        if (!alive) return;
        setReports(list);
        setStatus("ready");
      })
      .catch(() => {
        if (!alive) return;
        setStatus("failed");
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [enabled, slug, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const upvote = useCallback(
    async (id: string) => {
      try {
        const counted = await upvoteReport(id, { enabled });
        if (counted) {
          setReports((prev) =>
            prev.map((r) =>
              r.id === id ? { ...r, upvotes: r.upvotes + 1 } : r,
            ),
          );
        }
        return counted;
      } catch {
        return false;
      }
    },
    [enabled],
  );

  return { status, reports, reload, upvote };
}
