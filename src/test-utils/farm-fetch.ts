/**
 * `fetch` doubles for the cards that ask the Worker (farm weather, the ENSO
 * phase, a place's profile, history and normals). Nothing touches the network.
 *
 *   - `pendingFetch()`: every request hangs, so a card stays in its loading
 *     state and no state update lands after a test has finished. For tests of
 *     something else that happens to render those cards.
 *   - `routeFetch(routes)`: answers by path from recorded Worker answers (or a
 *     status), so a test can choose each route's outcome.
 */

import agricultureHarare from "@/api/__fixtures__/agriculture-harare.json";
import enso from "@/api/__fixtures__/enso.json";
import historyHarare from "@/api/__fixtures__/history-harare-8.json";
import normalsHarare from "@/api/__fixtures__/normals-harare.json";
import profileHarare from "@/api/__fixtures__/profile-harare.json";
import { resetPlaceProfileCache } from "@/api/profile";

export type Route = { status?: number; body?: unknown } | "hang" | "offline";

export const RECORDED: Record<string, Route> = {
  "/v1/agriculture": { body: agricultureHarare },
  "/v1/enso": { body: enso },
  "/v1/locations/profile": { body: profileHarare },
  "/v1/normals": { body: normalsHarare },
  "/v1/history": { body: historyHarare },
};

function reply(route: Route): Promise<Response> {
  if (route === "hang") return new Promise<Response>(() => undefined);
  if (route === "offline")
    return Promise.reject(new TypeError("Network request failed"));
  const status = route.status ?? 200;
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => "application/json" },
    json: async () => route.body,
    text: async () => JSON.stringify(route.body),
  } as unknown as Response);
}

/** Every request hangs. */
export function pendingFetch(): void {
  resetPlaceProfileCache();
  globalThis.fetch = jest.fn(() => reply("hang")) as unknown as typeof fetch;
}

/** Answer by path; a path not listed hangs. Returns the paths asked, in order. */
export function routeFetch(routes: Record<string, Route>): string[] {
  resetPlaceProfileCache();
  const asked: string[] = [];
  globalThis.fetch = jest.fn((url: unknown) => {
    const path = new URL(String(url)).pathname;
    asked.push(path);
    return reply(routes[path] ?? "hang");
  }) as unknown as typeof fetch;
  return asked;
}
