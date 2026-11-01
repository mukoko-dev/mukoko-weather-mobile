/**
 * Test helper: a `fetch` that answers from a queue of recorded replies, so the
 * API client tests exercise the real URL building, header handling and error
 * mapping without touching the network.
 *
 * Replies are plain objects (usually a recorded JSON fixture from the Worker),
 * returned in order. Every call is recorded on the returned mock.
 */

export type MockReply = {
  status?: number;
  body?: unknown;
  /** Response headers; names are matched case-insensitively. */
  headers?: Record<string, string>;
  /** Reject like a network failure instead of answering. */
  networkError?: Error;
};

export type RecordedCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  signal?: AbortSignal | null;
};

function lowerKeys(h: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(h).map(([k, v]) => [k.toLowerCase(), v]),
  );
}

/** Install a fake `fetch` answering with `replies` in order; returns its calls. */
export function mockFetch(...replies: MockReply[]): RecordedCall[] {
  const calls: RecordedCall[] = [];
  const queue = [...replies];
  globalThis.fetch = jest.fn(async (url: unknown, init?: RequestInit) => {
    calls.push({
      url: String(url),
      method: init?.method ?? "GET",
      headers: lowerKeys((init?.headers as Record<string, string>) ?? {}),
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
      signal: init?.signal,
    });
    const reply = queue.shift();
    if (!reply) throw new Error(`Unexpected fetch to ${String(url)}`);
    if (reply.networkError) throw reply.networkError;
    const headers = lowerKeys({
      "content-type": "application/json",
      ...reply.headers,
    });
    const status = reply.status ?? 200;
    const body = reply.body;
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
      json: async () => body,
      text: async () =>
        typeof body === "string" ? body : JSON.stringify(body),
    } as unknown as Response;
  }) as unknown as typeof fetch;
  return calls;
}
