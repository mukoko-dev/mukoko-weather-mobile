/**
 * Community weather reports: the list, filing one, and upvoting.
 *
 *   GET  /v1/reports?location=<slug>&hours=1..72   -> { reports, location }
 *   POST /v1/reports  { locationSlug, reportType, severity, description }
 *                                                  -> 201 { id, verified, expiresIn }
 *   POST /v1/reports/upvote { reportId }           -> { upvoted, reason? }
 *
 * This is the contract of mukoko-dev/mukoko-weather PR #401 (the places Worker
 * `reports.rs`, rules in `weather_core::community`). PR #401 is not merged or
 * deployed: `GET /v1/reports` answers 404 on production (checked 2026-11-01).
 * So every call here is behind ONE switch, `COMMUNITY_REPORTS_ENABLED`, which
 * is off. While it is off no request is made at all (not even the list), the
 * list shows its "not live yet" state and the wizard cannot send. Flip it to
 * true, and update the test that pins it, once the routes answer.
 *
 * Privacy: a report is sent with the place's slug and the person's choices and
 * no coordinate (`submitBody`), as the web wizard does. The reporter is a hash
 * of the network address on the server; the app sends no account or device id.
 */

import { ApiError, apiFetch, ROUTES } from "@/api/client";
import {
  LIST_HOURS,
  type CommunityReport,
  type ReportDraft,
  parseReports,
  submitBody,
  validReportId,
} from "@/shared/report-types";

/**
 * Off until the routes are deployed (PR #401 in mukoko-dev/mukoko-weather).
 * `src/api/reports.test.ts` pins it off; changing it is a decision with the
 * Worker deploy, not a refactor.
 */
export const COMMUNITY_REPORTS_ENABLED: boolean = false;

/** Why nothing was sent: the switch is off. Not a failure of the network. */
export class ReportsNotLiveError extends Error {
  constructor() {
    super("Community reports are not live in the app yet.");
    this.name = "ReportsNotLiveError";
  }
}

/** What the person is told for a refused report (never the URL or a stack). */
export function reportFailureMessage(err: unknown): string {
  if (err instanceof ReportsNotLiveError) return err.message;
  if (err instanceof ApiError) {
    if (err.status === 429) {
      return "You have sent the most reports allowed this hour. Try again later.";
    }
    if (err.status === 404) {
      return "This place is not known to the weather service, so it cannot take a report.";
    }
    if (err.status === 503) {
      return "Community reports are unavailable right now. Try again in a few minutes.";
    }
    if (err.status === 400 || err.status === 422) {
      // The Worker's own sentence ("Description too long (max 300 characters)").
      return err.message;
    }
    return "The report could not be sent. Try again.";
  }
  return "The report could not be sent. Check your connection and try again.";
}

/** Reports near a place in the last day (or `hours`, 1 to 72). */
export async function fetchReports(
  locationSlug: string,
  opts: {
    hours?: number;
    signal?: AbortSignal;
    enabled?: boolean;
  } = {},
): Promise<CommunityReport[]> {
  if (!(opts.enabled ?? COMMUNITY_REPORTS_ENABLED)) {
    throw new ReportsNotLiveError();
  }
  const body = await apiFetch<unknown>(ROUTES.reports, {
    query: { location: locationSlug, hours: opts.hours ?? LIST_HOURS },
    signal: opts.signal,
  });
  return parseReports(body);
}

export type SubmitResult = {
  id: string;
  /** True when the forecast at the place backed the report up. */
  verified: boolean;
  /** Seconds the report stays listed (24, 48 or 72 hours by severity). */
  expiresIn: number;
};

/** File a report. Throws `ReportsNotLiveError` (and sends nothing) while off. */
export async function submitReport(
  locationSlug: string,
  draft: ReportDraft,
  opts: { signal?: AbortSignal; enabled?: boolean } = {},
): Promise<SubmitResult> {
  if (!(opts.enabled ?? COMMUNITY_REPORTS_ENABLED)) {
    throw new ReportsNotLiveError();
  }
  const data = await apiFetch<Partial<SubmitResult>>(ROUTES.reports, {
    method: "POST",
    json: submitBody(locationSlug, draft),
    signal: opts.signal,
  });
  return {
    id: typeof data?.id === "string" ? data.id : "",
    verified: data?.verified === true,
    expiresIn: typeof data?.expiresIn === "number" ? data.expiresIn : 0,
  };
}

/** Upvote a report. `true` when the vote counted (one vote per client). */
export async function upvoteReport(
  reportId: string,
  opts: { signal?: AbortSignal; enabled?: boolean } = {},
): Promise<boolean> {
  if (!(opts.enabled ?? COMMUNITY_REPORTS_ENABLED)) {
    throw new ReportsNotLiveError();
  }
  if (!validReportId(reportId)) return false;
  const data = await apiFetch<{ upvoted?: unknown }>(ROUTES.reportsUpvote, {
    method: "POST",
    json: { reportId },
    signal: opts.signal,
  });
  return data?.upvoted === true;
}
