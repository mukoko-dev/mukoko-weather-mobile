/**
 * Error copy follows the cause (issue #74): only a request that got no answer
 * asks the person to check their connection; a source failure says so; the
 * error's own (developer) text is never shown.
 */

import { ApiError, NetworkError } from "@/api/client";
import {
  FAILURE_COPY,
  ProviderFallbackError,
  failureKind,
  failureMessage,
} from "@/api/failure";

const URL = "https://weather-api.mukoko.com/v1/weather";

describe("failureKind", () => {
  it.each([
    [new NetworkError("offline", URL), "offline"],
    [new NetworkError("timeout", URL), "timeout"],
    [new ProviderFallbackError(), "provider"],
    [new ApiError("bad gateway", 502, URL), "provider"],
    [new ApiError("down", 503, URL), "provider"],
    [new ApiError("no such place", 404, URL), "not_found"],
    [new ApiError("slow down", 429, URL), "rate_limited"],
    [new ApiError("bad request", 400, URL), "unknown"],
    [new Error("fetch failed: Could not connect to the server."), "unknown"],
    ["a string", "unknown"],
    [undefined, "unknown"],
  ] as const)("reads %p as %s", (err, kind) => {
    expect(failureKind(err)).toBe(kind);
  });
});

describe("failureMessage", () => {
  it("asks about the connection only when nothing answered", () => {
    const blames = (
      Object.keys(FAILURE_COPY) as (keyof typeof FAILURE_COPY)[]
    ).filter((k) => /connection/i.test(FAILURE_COPY[k]));
    expect(blames).toEqual(["offline"]);
  });

  it("says the source failed, not the person or the place, on a 5xx or the estimate", () => {
    for (const err of [
      new ApiError("x", 500, URL),
      new ProviderFallbackError(),
    ]) {
      const message = failureMessage(err);
      expect(message).toMatch(/weather source/);
      expect(message).not.toMatch(/connection|sea|grid/i);
    }
  });

  it("never shows the error's own text", () => {
    const raw = "fetch failed: Could not connect to the server.";
    expect(failureMessage(new Error(raw))).not.toContain(raw);
    expect(
      failureMessage(new NetworkError("offline", URL, new Error(raw))),
    ).not.toContain(raw);
  });
});
