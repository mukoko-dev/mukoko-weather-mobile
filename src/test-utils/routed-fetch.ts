/**
 * A `fetch` that answers by path, for screens that ask for several things in
 * an order the test does not control (the activity lists, the rules, ...).
 * Unlike `mockFetch` (a queue), each path keeps answering, and a path with no
 * answer fails the test loudly instead of being guessed.
 */

import type { RecordedCall } from "@/api/mock-fetch";

export type Routed = {
  status?: number;
  body?: unknown;
  /** Reject like a network failure. */
  networkError?: Error;
};

/**
 * Install the fake. `routes` maps `"GET /v1/suitability"` (method and path,
 * without the query) to a reply or a function of the call. Returns the calls.
 */
export function routedFetch(
  routes: Record<string, Routed | ((call: RecordedCall) => Routed)>,
): RecordedCall[] {
  const calls: RecordedCall[] = [];
  globalThis.fetch = jest.fn(async (url: unknown, init?: RequestInit) => {
    const full = String(url);
    const call: RecordedCall = {
      url: full,
      method: init?.method ?? "GET",
      headers: {},
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
      signal: init?.signal,
    };
    calls.push(call);
    const path = new URL(full).pathname;
    const route = routes[`${call.method} ${path}`];
    if (!route) throw new Error(`Unexpected fetch ${call.method} ${full}`);
    const reply = typeof route === "function" ? route(call) : route;
    if (reply.networkError) throw reply.networkError;
    const status = reply.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: {
        get: (n: string) =>
          n.toLowerCase() === "content-type" ? "application/json" : null,
      },
      json: async () => reply.body,
      text: async () => JSON.stringify(reply.body),
    } as unknown as Response;
  }) as unknown as typeof fetch;
  return calls;
}
