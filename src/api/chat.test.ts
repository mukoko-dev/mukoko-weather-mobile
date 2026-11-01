/**
 * Tests for the Shamwari chat client against `POST /v1/ai/chat`. The network
 * is a recorded reply (the shapes come from workers/ai in mukoko-dev/
 * mukoko-weather), never the real model, so we exercise request shaping (trim,
 * caps, activities) and the mapping of every failure to a graceful reply.
 */

import {
  MAX_MESSAGE_LEN,
  EmptyMessageError,
  sendChatMessage,
} from "@/api/chat";
import { mockFetch } from "@/api/mock-fetch";

const CHAT_URL = "https://weather-api.mukoko.com/v1/ai/chat";
const OK = { response: "Hello", references: [] };

describe("sendChatMessage", () => {
  it("posts to /v1/ai/chat with a trimmed message and empty history", async () => {
    const calls = mockFetch({ body: OK });
    const res = await sendChatMessage({ message: "  hi there  " });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(CHAT_URL);
    expect(calls[0].method).toBe("POST");
    expect(calls[0].body).toEqual({ message: "hi there", history: [] });
    expect(res).toEqual({
      response: "Hello",
      references: [],
      error: undefined,
    });
  });

  it("returns the places Shamwari names, as the Worker sends them", async () => {
    mockFetch({
      body: {
        response: "Harare is clear and warm.",
        references: [{ slug: "harare", name: "Harare", type: "location" }],
      },
    });
    const res = await sendChatMessage({ message: "weather in Harare?" });
    expect(res.references).toEqual([
      { slug: "harare", name: "Harare", type: "location" },
    ]);
  });

  it("caps history to the last 10 turns and truncates each entry", async () => {
    const calls = mockFetch({ body: OK });
    const history = Array.from({ length: 14 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: "x".repeat(MAX_MESSAGE_LEN + 50),
    }));

    await sendChatMessage({ message: "q", history });

    const body = calls[0].body as { history: { content: string }[] };
    expect(body.history).toHaveLength(10);
    expect(body.history[0].content.length).toBe(MAX_MESSAGE_LEN);
  });

  it("truncates the outgoing message to the server maximum", async () => {
    const calls = mockFetch({ body: OK });
    await sendChatMessage({ message: "y".repeat(MAX_MESSAGE_LEN + 100) });
    expect((calls[0].body as { message: string }).message.length).toBe(
      MAX_MESSAGE_LEN,
    );
  });

  it("includes activities only when provided and non-empty", async () => {
    const calls = mockFetch({ body: OK }, { body: OK });

    await sendChatMessage({ message: "q", activities: [] });
    expect(calls[0].body).not.toHaveProperty("activities");

    await sendChatMessage({ message: "q", activities: ["running"] });
    expect(calls[1].body).toMatchObject({ activities: ["running"] });
  });

  it("throws EmptyMessageError for a blank message, without a request", async () => {
    const calls = mockFetch();
    await expect(sendChatMessage({ message: "   " })).rejects.toBeInstanceOf(
      EmptyMessageError,
    );
    expect(calls).toHaveLength(0);
  });

  it("returns a rate-limit fallback on HTTP 429", async () => {
    mockFetch({
      status: 429,
      headers: { "Retry-After": "60" },
      body: {
        error: "rate_limited",
        error_description:
          "Shamwari is busy right now. Please try again shortly.",
      },
    });
    const res = await sendChatMessage({ message: "q" });
    expect(res.error).toBe(true);
    expect(res.references).toEqual([]);
    expect(res.response).toMatch(/hourly limit/i);
  });

  it("returns a service fallback on HTTP 503", async () => {
    mockFetch({
      status: 503,
      body: {
        error: "guardrails_unavailable",
        error_description: "Shamwari is unavailable right now.",
      },
    });
    const res = await sendChatMessage({ message: "q" });
    expect(res.error).toBe(true);
    expect(res.response).toMatch(/resting/i);
  });

  it("tells the person to remove personal details when the Worker refuses them", async () => {
    mockFetch({
      status: 422,
      body: {
        error: "personal_data_detected",
        error_description:
          "Please remove personal details (email addresses, phone numbers or card numbers) and ask again.",
      },
    });
    const res = await sendChatMessage({ message: "mail me at a@b.co" });
    expect(res.error).toBe(true);
    expect(res.response).toMatch(/remove personal details/i);
  });

  it("prefers a server-supplied response body over the generic fallback", async () => {
    mockFetch({
      status: 503,
      body: { response: "Custom recovery message" },
    });
    const res = await sendChatMessage({ message: "q" });
    expect(res.response).toBe("Custom recovery message");
    expect(res.error).toBe(true);
  });

  it("passes on the Worker's own graceful 'trouble' answer", async () => {
    mockFetch({
      body: {
        response: "Shamwari is having trouble right now.",
        references: [],
        error: true,
      },
    });
    const res = await sendChatMessage({ message: "q" });
    expect(res).toEqual({
      response: "Shamwari is having trouble right now.",
      references: [],
      error: true,
    });
  });

  it("returns a generic fallback on a non-API (network) error", async () => {
    mockFetch({ networkError: new Error("Network request failed") });
    const res = await sendChatMessage({ message: "q" });
    expect(res.error).toBe(true);
    expect(res.response).toMatch(/trouble connecting/i);
  });

  it("rethrows AbortError so callers can ignore cancellations", async () => {
    const abort = new Error("aborted");
    abort.name = "AbortError";
    mockFetch({ networkError: abort });
    await expect(sendChatMessage({ message: "q" })).rejects.toBe(abort);
  });
});
