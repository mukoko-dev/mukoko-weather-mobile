/**
 * Test helper: a `fetch` that answers by ROUTE (the URL's path), not by order,
 * for screens that ask the Worker for several things at once. Each route maps
 * to a recorded reply; a route with no reply fails like a network error. Every
 * call is recorded. (`mockFetch` answers in order, for one request at a time.)
 */

import { type MockReply, type RecordedCall } from "./mock-fetch";

/** A reply, or a function returning one (or a promise of one, to hold it back). */
export type RouteReplies = Record<
  string,
  MockReply | (() => MockReply | Promise<MockReply>)
>;

export function routeFetch(routes: RouteReplies): RecordedCall[] {
  const calls: RecordedCall[] = [];
  globalThis.fetch = jest.fn(async (url: unknown, init?: RequestInit) => {
    const href = String(url);
    calls.push({
      url: href,
      method: init?.method ?? "GET",
      headers: {},
      body: undefined,
      signal: init?.signal,
    });
    const path = new URL(href).pathname;
    const entry = routes[path];
    if (!entry) throw new Error(`No route for ${path}`);
    const reply = typeof entry === "function" ? await entry() : entry;
    if (reply.networkError) throw reply.networkError;
    const status = reply.status ?? 200;
    const headers: Record<string, string> = {
      "content-type": "application/json",
      ...Object.fromEntries(
        Object.entries(reply.headers ?? {}).map(([k, v]) => [
          k.toLowerCase(),
          v,
        ]),
      ),
    };
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (n: string) => headers[n.toLowerCase()] ?? null },
      json: async () => reply.body,
      text: async () =>
        typeof reply.body === "string"
          ? reply.body
          : JSON.stringify(reply.body),
    } as unknown as Response;
  }) as unknown as typeof fetch;
  return calls;
}
