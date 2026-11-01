/**
 * Community reports. The routes are not deployed (mukoko-dev/mukoko-weather
 * PR #401), so the switch is pinned OFF here exactly as device registration is,
 * and with it off NOTHING touches the network. The shapes below follow the
 * Worker code on that branch (`workers/places/src/reports.rs`); they are
 * replies written from the contract, not recorded from production.
 */

import { ApiError } from "@/api/client";
import { mockFetch } from "@/api/mock-fetch";
import {
  COMMUNITY_REPORTS_ENABLED,
  ReportsNotLiveError,
  fetchReports,
  reportFailureMessage,
  submitReport,
  upvoteReport,
} from "@/api/reports";

const BASE = "https://weather-api.mukoko.com";
const DRAFT = {
  reportType: "heavy-rain",
  severity: "severe" as const,
  description: "  Roads flooding  ",
};
const ID = "0123456789abcdef01234567";

describe("the switch", () => {
  it("is OFF: the routes answer 404 on production today", () => {
    expect(COMMUNITY_REPORTS_ENABLED).toBe(false);
  });

  it("sends nothing at all while off: no list, no report, no vote", async () => {
    const calls = mockFetch();
    await expect(fetchReports("harare")).rejects.toBeInstanceOf(
      ReportsNotLiveError,
    );
    await expect(submitReport("harare", DRAFT)).rejects.toBeInstanceOf(
      ReportsNotLiveError,
    );
    await expect(upvoteReport(ID)).rejects.toBeInstanceOf(ReportsNotLiveError);
    expect(calls).toHaveLength(0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("with the switch on (the contract, for the day the routes are live)", () => {
  it("lists reports with the place and the hours in the query", async () => {
    const calls = mockFetch({
      body: {
        location: "harare",
        reports: [
          {
            id: ID,
            reportType: "frost",
            severity: "mild",
            description: "",
            reportedAt: "2026-11-01T01:00:00.000Z",
            upvotes: 2,
            verified: false,
            locationName: "Harare",
          },
        ],
      },
    });
    const list = await fetchReports("harare", { enabled: true });
    expect(calls[0].method).toBe("GET");
    expect(calls[0].url).toBe(`${BASE}/v1/reports?location=harare&hours=24`);
    expect(list.map((r) => r.id)).toEqual([ID]);
  });

  it("files a report with the slug and choices and NO coordinate", async () => {
    const calls = mockFetch({
      status: 201,
      body: { id: ID, verified: true, expiresIn: 259200 },
    });
    const res = await submitReport("harare", DRAFT, { enabled: true });
    expect(calls[0].method).toBe("POST");
    expect(calls[0].url).toBe(`${BASE}/v1/reports`);
    expect(calls[0].body).toEqual({
      locationSlug: "harare",
      reportType: "heavy-rain",
      severity: "severe",
      description: "Roads flooding",
    });
    expect(JSON.stringify(calls[0].body)).not.toMatch(/lat|lon/);
    expect(res).toEqual({ id: ID, verified: true, expiresIn: 259200 });
  });

  it("upvotes by report id, and refuses a malformed id before any request", async () => {
    const calls = mockFetch({ body: { upvoted: true } });
    expect(await upvoteReport(ID, { enabled: true })).toBe(true);
    expect(calls[0].url).toBe(`${BASE}/v1/reports/upvote`);
    expect(calls[0].body).toEqual({ reportId: ID });
    expect(await upvoteReport("nope", { enabled: true })).toBe(false);
    expect(calls).toHaveLength(1);
  });

  it("reads an upvote that did not count as false", async () => {
    mockFetch({
      body: { upvoted: false, reason: "Already upvoted or report not found" },
    });
    expect(await upvoteReport(ID, { enabled: true })).toBe(false);
  });
});

describe("reportFailureMessage", () => {
  const err = (status: number, message = "x") =>
    new ApiError(message, status, "https://x/y");

  it("explains the limit, an unknown place and an outage in plain words", () => {
    expect(reportFailureMessage(err(429))).toMatch(/most reports allowed/);
    expect(reportFailureMessage(err(404))).toMatch(/not known/);
    expect(reportFailureMessage(err(503))).toMatch(/unavailable/);
  });

  it("passes the Worker's own sentence for a refused body", () => {
    expect(
      reportFailureMessage(
        err(400, "Description too long (max 300 characters)"),
      ),
    ).toBe("Description too long (max 300 characters)");
  });

  it("says the network is the problem for anything else, and never leaks a URL", () => {
    const text = reportFailureMessage(new TypeError("Network request failed"));
    expect(text).toMatch(/connection/);
    expect(reportFailureMessage(err(500))).not.toMatch(/https?:/);
    expect(reportFailureMessage(new ReportsNotLiveError())).toMatch(/not live/);
  });
});
