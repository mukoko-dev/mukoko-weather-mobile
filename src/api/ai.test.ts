/**
 * The AI summary and follow-up. The shapes follow the AI Worker's handlers
 * (`workers/ai/src/handlers.rs` in mukoko-dev/mukoko-weather) and its live
 * validation answers (an empty body is refused with 422 / 400). The privacy
 * rule is pinned: the activities a person picked are never in a body.
 */

import { mockFetch } from "@/api/mock-fetch";
import {
  MAX_FOLLOWUP_LEN,
  MAX_FOLLOWUP_MESSAGES,
  fetchAiSummary,
  followupBody,
  sendFollowup,
  summaryBody,
} from "@/api/ai";

const BASE = "https://weather-api.mukoko.com";
const PLACE = {
  slug: "harare",
  name: "Harare",
  lat: -17.8252,
  lon: 31.0335,
  country: "ZW",
  elevation: 1490,
};

describe("summaryBody", () => {
  it("carries the place and nothing about the person", () => {
    const body = summaryBody(PLACE);
    expect(body).toEqual({
      location: {
        slug: "harare",
        name: "Harare",
        lat: -17.8252,
        lon: 31.0335,
        country: "ZW",
        elevation: 1490,
      },
    });
    expect(JSON.stringify(body)).not.toMatch(/activit/i);
  });

  it("leaves out what it does not know", () => {
    expect(summaryBody({ name: "A", lat: 1, lon: 2, elevation: null })).toEqual(
      {
        location: { name: "A", lat: 1, lon: 2 },
      },
    );
  });
});

describe("fetchAiSummary", () => {
  it("POSTs the place to /v1/ai/summary and reads the insight", async () => {
    const calls = mockFetch({
      body: {
        insight: "  Warm and dry today.  ",
        cached: true,
        generatedAt: "2026-11-01T01:00:00Z",
      },
    });
    const s = await fetchAiSummary(PLACE);
    expect(calls[0].url).toBe(`${BASE}/v1/ai/summary`);
    expect(calls[0].method).toBe("POST");
    expect(s).toEqual({
      insight: "Warm and dry today.",
      cached: true,
      generatedAt: "2026-11-01T01:00:00Z",
    });
  });

  it("throws on an empty insight and on a refused request", async () => {
    mockFetch({ body: { insight: "   " } });
    await expect(fetchAiSummary(PLACE)).rejects.toThrow("empty");
    mockFetch({
      status: 422,
      body: {
        error: "invalid_request",
        error_description: "`location.lat` and `location.lon` are required.",
      },
    });
    await expect(fetchAiSummary(PLACE)).rejects.toMatchObject({ status: 422 });
  });
});

describe("followupBody", () => {
  it("caps lengths, keeps the last ten turns and sends no activities", () => {
    const history = Array.from({ length: 14 }, (_, i) => ({
      role: i % 2 ? ("assistant" as const) : ("user" as const),
      content: "x".repeat(MAX_FOLLOWUP_LEN + 50),
    }));
    const body = followupBody({
      message: "  Will it rain?  ",
      locationName: "Harare",
      locationSlug: "harare",
      weatherSummary: "y".repeat(MAX_FOLLOWUP_LEN + 10),
      history,
    });
    expect(body.message).toBe("Will it rain?");
    expect(body.history).toHaveLength(MAX_FOLLOWUP_MESSAGES * 2);
    expect(body.history[0].content).toHaveLength(MAX_FOLLOWUP_LEN);
    expect(body.weatherSummary).toHaveLength(MAX_FOLLOWUP_LEN);
    expect(body.season).toBe("");
    expect(JSON.stringify(body)).not.toMatch(/activit/i);
  });
});

describe("sendFollowup", () => {
  const input = {
    message: "Will it rain?",
    locationName: "Harare",
    locationSlug: "harare",
    weatherSummary: "Warm.",
    history: [],
  };

  it("POSTs to /v1/ai/followup and returns the reply", async () => {
    const calls = mockFetch({ body: { response: "Not today." } });
    const r = await sendFollowup(input);
    expect(calls[0].url).toBe(`${BASE}/v1/ai/followup`);
    expect(r).toEqual({ response: "Not today.", failed: false });
  });

  it("marks the Worker's own trouble reply as failed", async () => {
    mockFetch({ body: { response: "Trouble.", error: true } });
    expect(await sendFollowup(input)).toEqual({
      response: "Trouble.",
      failed: true,
    });
  });

  it("turns a rate limit and a network failure into replies, never a throw", async () => {
    mockFetch({ status: 429, body: { error: "rate_limited" } });
    const limited = await sendFollowup(input);
    expect(limited.failed).toBe(true);
    expect(limited.response).toMatch(/limit/);
    mockFetch({ networkError: new TypeError("Network request failed") });
    const down = await sendFollowup(input);
    expect(down.failed).toBe(true);
    expect(down.response).toMatch(/couldn't process/);
  });

  it("rethrows an abort so a cancelled ask is not shown as an answer", async () => {
    const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
    mockFetch({ networkError: abort });
    await expect(sendFollowup(input)).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
