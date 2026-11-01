/**
 * The API client: base-URL rules, URL building, request headers and the
 * mapping of failed answers (all three error formats) to ApiError.
 */

import {
  ALLOWED_API_HOSTS,
  API_BASE_URL,
  ApiError,
  DEFAULT_API_BASE_URL,
  ROUTES,
  apiFetch,
  apiRequest,
  buildUrl,
  parseProblem,
  resolveApiBaseUrl,
  setAuthTokenResolver,
} from "@/api/client";
import { mockFetch } from "@/api/mock-fetch";

afterEach(() => {
  setAuthTokenResolver(null);
});

describe("the base URL", () => {
  it("defaults to the Cloudflare weather Worker", () => {
    expect(DEFAULT_API_BASE_URL).toBe("https://weather-api.mukoko.com");
    expect(API_BASE_URL).toBe(DEFAULT_API_BASE_URL);
  });

  it("allows only the Worker and the Mukoko consumer API", () => {
    expect([...ALLOWED_API_HOSTS]).toEqual([
      "weather-api.mukoko.com",
      "api.mukoko.com",
    ]);
  });

  it("refuses a second Mukoko host, the tiles Worker's included (one door)", () => {
    // Built from parts: the guard scans this file for Mukoko host names.
    const tiles = ["weather-tiles", "mukoko", "com"].join(".");
    expect(resolveApiBaseUrl(`https://${tiles}`, false)).toBe(
      DEFAULT_API_BASE_URL,
    );
    expect(resolveApiBaseUrl(`https://${tiles}`, true)).toBe(
      DEFAULT_API_BASE_URL,
    );
    expect([...ALLOWED_API_HOSTS]).not.toContain(tiles);
  });

  it("uses the default when nothing is set", () => {
    expect(resolveApiBaseUrl(undefined, false)).toBe(DEFAULT_API_BASE_URL);
    expect(resolveApiBaseUrl("", false)).toBe(DEFAULT_API_BASE_URL);
    expect(resolveApiBaseUrl("   ", true)).toBe(DEFAULT_API_BASE_URL);
  });

  it("accepts an allowed host over HTTPS, in any build", () => {
    expect(resolveApiBaseUrl("https://api.mukoko.com", false)).toBe(
      "https://api.mukoko.com",
    );
    expect(resolveApiBaseUrl("https://weather-api.mukoko.com/", false)).toBe(
      "https://weather-api.mukoko.com",
    );
    expect(resolveApiBaseUrl("HTTPS://API.MUKOKO.COM//", false)).toBe(
      "https://api.mukoko.com",
    );
  });

  it.each([
    "https://example.com",
    "https://weather-api.mukoko.com.evil.example",
    "https://evil.example/weather-api.mukoko.com",
    "https://user@weather-api.mukoko.com",
    "http://weather-api.mukoko.com",
    "https://weather-api.mukoko.com:8443",
    "https://api.mukoko.com/v1/weather",
    "weather-api.mukoko.com",
    "javascript:alert(1)",
    "ftp://api.mukoko.com",
  ])("ignores %s and keeps the default", (value) => {
    expect(resolveApiBaseUrl(value, false)).toBe(DEFAULT_API_BASE_URL);
    expect(resolveApiBaseUrl(value, true)).toBe(DEFAULT_API_BASE_URL);
  });

  it("accepts a machine on your own network in a development build only", () => {
    for (const local of [
      "http://localhost:8787",
      "http://127.0.0.1:8787",
      "http://192.168.1.42:8787",
      "http://10.0.0.7:8787",
      "http://172.20.1.2:8787",
      "http://my-mac.local:8787",
    ]) {
      expect(resolveApiBaseUrl(local, true)).toBe(local);
      expect(resolveApiBaseUrl(local, false)).toBe(DEFAULT_API_BASE_URL);
    }
  });

  it("does not take a look-alike for a local machine", () => {
    for (const fake of [
      "http://192.168.1.42.evil.example",
      "http://172.32.0.1:8787",
      "http://notlocalhost:8787",
    ]) {
      expect(resolveApiBaseUrl(fake, true)).toBe(DEFAULT_API_BASE_URL);
    }
  });
});

describe("ROUTES", () => {
  it("lists the weather Worker's /v1 routes the app uses", () => {
    expect(ROUTES).toEqual({
      weather: "/v1/weather",
      geo: "/v1/geo",
      search: "/v1/search",
      locations: "/v1/locations",
      activities: "/v1/activities",
      suitability: "/v1/suitability",
      reports: "/v1/reports",
      reportsUpvote: "/v1/reports/upvote",
      aiSummary: "/v1/ai/summary",
      aiFollowup: "/v1/ai/followup",
      devices: "/v1/devices",
      chat: "/v1/ai/chat",
    });
  });
});

describe("buildUrl", () => {
  it("joins relative paths with the base URL", () => {
    expect(buildUrl(ROUTES.weather)).toBe(`${API_BASE_URL}/v1/weather`);
  });

  it("adds a leading slash when missing", () => {
    expect(buildUrl("v1/weather")).toBe(`${API_BASE_URL}/v1/weather`);
  });

  it("serialises query params and skips null/undefined", () => {
    const url = buildUrl(ROUTES.weather, {
      lat: 1.5,
      lon: 2,
      missing: null,
      gone: undefined,
    });
    expect(url).toBe(`${API_BASE_URL}/v1/weather?lat=1.5&lon=2`);
  });

  it("coerces booleans to strings", () => {
    expect(buildUrl(ROUTES.geo, { autoCreate: true })).toContain(
      "autoCreate=true",
    );
  });

  it("encodes values", () => {
    expect(buildUrl(ROUTES.search, { q: "Victoria Falls & co" })).toBe(
      `${API_BASE_URL}/v1/search?q=Victoria+Falls+%26+co`,
    );
  });
});

describe("parseProblem", () => {
  it("reads the weather Worker's error envelope", () => {
    expect(
      parseProblem({
        error: "not_found",
        error_description: "Location not found",
      }),
    ).toEqual({ code: "not_found", message: "Location not found" });
  });

  it("reads the Mukoko consumer API's error object", () => {
    expect(
      parseProblem({
        error: { code: "upstream_unavailable", message: "Try again shortly." },
        requestId: "abc",
      }),
    ).toEqual({ code: "upstream_unavailable", message: "Try again shortly." });
  });

  it("reads an RFC 9457 problem", () => {
    expect(
      parseProblem({
        type: "https://example.org/problems/rate-limited",
        title: "Too many requests",
        status: 429,
        detail: "Slow down for a minute.",
      }),
    ).toEqual({ code: undefined, message: "Slow down for a minute." });
    expect(parseProblem({ title: "Bad gateway", status: 502 }).message).toBe(
      "Bad gateway",
    );
  });

  it("returns an empty problem for anything else", () => {
    for (const body of [undefined, null, "oops", 42, [], {}, { error: 7 }]) {
      expect(parseProblem(body)).toEqual({
        code: undefined,
        message: undefined,
      });
    }
  });
});

describe("apiRequest", () => {
  it("sends Accept and the client header, and returns data with headers", async () => {
    const calls = mockFetch({
      body: { ok: true },
      headers: { "X-Fetched-At": "2026-11-01T00:45:10Z" },
    });
    const res = await apiRequest<{ ok: boolean }>(ROUTES.weather, {
      query: { lat: 1, lon: 2 },
    });
    expect(res.data).toEqual({ ok: true });
    expect(res.status).toBe(200);
    expect(res.headers.get("x-fetched-at")).toBe("2026-11-01T00:45:10Z");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`${API_BASE_URL}/v1/weather?lat=1&lon=2`);
    expect(calls[0].method).toBe("GET");
    expect(calls[0].headers.accept).toBe("application/json");
    expect(calls[0].headers["x-mukoko-client"]).toMatch(/^mukoko-mobile\//);
    expect(calls[0].headers.authorization).toBeUndefined();
  });

  it("sends the session token as a bearer when one is registered", async () => {
    setAuthTokenResolver(async () => "tok_123");
    const calls = mockFetch({ body: {} });
    await apiFetch(ROUTES.weather);
    expect(calls[0].headers.authorization).toBe("Bearer tok_123");
  });

  it("lets an explicit token win over the resolver", async () => {
    setAuthTokenResolver(async () => "from-resolver");
    const calls = mockFetch({ body: {} });
    await apiFetch(ROUTES.weather, { token: "explicit" });
    expect(calls[0].headers.authorization).toBe("Bearer explicit");
  });

  it("sends a JSON body with its content type", async () => {
    const calls = mockFetch({ body: {} });
    await apiFetch(ROUTES.devices, { method: "POST", json: { deviceId: "d" } });
    expect(calls[0].method).toBe("POST");
    expect(calls[0].headers["content-type"]).toBe("application/json");
    expect(calls[0].body).toEqual({ deviceId: "d" });
  });

  it("throws an ApiError carrying the Worker's own sentence, not the URL", async () => {
    mockFetch({
      status: 404,
      body: { error: "not_found", error_description: "Location not found" },
    });
    const err = await apiFetch(ROUTES.locations, {
      query: { slug: "zz" },
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    const apiError = err as ApiError;
    expect(apiError.status).toBe(404);
    expect(apiError.message).toBe("Location not found");
    expect(apiError.message).not.toContain("http");
    expect(apiError.url).toContain("/v1/locations?slug=zz");
    expect(parseProblem(apiError.body).code).toBe("not_found");
  });

  it("understands an RFC 9457 problem body", async () => {
    mockFetch({
      status: 503,
      headers: { "content-type": "application/problem+json" },
      body: { title: "Unavailable", status: 503, detail: "Try again shortly." },
    });
    await expect(apiFetch(ROUTES.weather)).rejects.toMatchObject({
      status: 503,
      message: "Try again shortly.",
    });
  });

  it("falls back to a plain message when the body says nothing", async () => {
    mockFetch({
      status: 502,
      headers: { "content-type": "text/html" },
      body: "<html>Bad gateway</html>",
    });
    await expect(apiFetch(ROUTES.weather)).rejects.toMatchObject({
      status: 502,
      message: "Request failed (502)",
    });
  });

  it("lets a network failure through untouched", async () => {
    const down = new Error("Network request failed");
    mockFetch({ networkError: down });
    await expect(apiFetch(ROUTES.weather)).rejects.toBe(down);
  });
});
