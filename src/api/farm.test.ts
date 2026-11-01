/**
 * Farm weather, the El Niño phase, a place's profile, and the history and
 * normals behind the 30-day card, against answers recorded from
 * weather-api.mukoko.com on 2026-11-01 (GET reads only). Nothing here touches
 * the network.
 */

import { ApiError } from "@/api/client";
import {
  fetchHistory30,
  fetchNormalsOn,
  fetchWindowNormals,
} from "@/api/agri-history";
import { fetchAgriculture, readAgriculture } from "@/api/agriculture";
import { fetchEnso, readEnso } from "@/api/enso";
import { mockFetch } from "@/api/mock-fetch";
import {
  PLACE_PROFILE_TTL_MS,
  fetchPlaceProfile,
  peekPlaceProfile,
  profileKey,
  profileQuery,
  resetPlaceProfileCache,
} from "@/api/profile";

import agricultureHarare from "./__fixtures__/agriculture-harare.json";
import agricultureOff from "./__fixtures__/agriculture-unavailable.json";
import ensoFixture from "./__fixtures__/enso.json";
import errorInvalid from "./__fixtures__/error-invalid-request.json";
import historyHarare from "./__fixtures__/history-harare-8.json";
import normalsHarare from "./__fixtures__/normals-harare.json";
import profileHarare from "./__fixtures__/profile-harare.json";

const BASE = "https://weather-api.mukoko.com";
const HARARE = { slug: "harare", lat: -17.83, lon: 31.05, country: "ZW" };

describe("GET /v1/agriculture", () => {
  it("asks for the place, its country and the crops", async () => {
    const calls = mockFetch({ body: agricultureHarare });
    await fetchAgriculture(HARARE, ["crop-farming", "tobacco-farming"]);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(
      `${BASE}/v1/agriculture?lat=-17.83&lon=31.05&location=harare&country=ZW&crops=crop-farming%2Ctobacco-farming`,
    );
    expect(calls[0].method).toBe("GET");
  });

  it("reads a recorded Harare answer as a full picture", async () => {
    mockFetch({ body: agricultureHarare });
    const result = await fetchAgriculture(HARARE, []);
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.data.verdict).toBe("go");
    expect(result.data.headline).toBe("Good day to spray, harvest and irrigate.");
    expect(result.data.windows?.plant.status).toBe("wait");
    expect(result.data.daily).toHaveLength(46);
    expect(result.data.calendar[0].label).toBe("Maize");
  });

  it("reads available:false with its reason as a value, not an error", async () => {
    mockFetch({ body: agricultureOff });
    expect(await fetchAgriculture({ slug: "sea", lat: 0, lon: -140 }, [])).toEqual({
      kind: "unavailable",
      reason: "provider_error",
      attribution: expect.stringContaining("Open-Meteo"),
    });
  });

  it.each(["provider_unavailable", "insufficient_data", "analysis_error"])(
    "carries the %s reason through",
    async (reason) => {
      mockFetch({ body: { ...agricultureOff, reason } });
      const result = await fetchAgriculture(HARARE, []);
      expect(result).toMatchObject({ kind: "unavailable", reason });
    },
  );

  it("reads available:true without the groups the card needs as unavailable, with no reason", () => {
    expect(
      readAgriculture({ ...agricultureHarare, windows: null }),
    ).toMatchObject({ kind: "unavailable", reason: null });
    expect(
      readAgriculture({ ...agricultureHarare, headline: null }),
    ).toMatchObject({ kind: "unavailable", reason: null });
    expect(
      readAgriculture({ ...agricultureHarare, verdict: null }),
    ).toMatchObject({ kind: "unavailable", reason: null });
  });

  it("fills a missing list with an empty one", () => {
    const r = readAgriculture({
      ...agricultureHarare,
      daily: undefined,
      calendar: undefined,
      sprayWindows: undefined,
    });
    expect(r.kind).toBe("ready");
    if (r.kind === "ready") {
      expect(r.data.daily).toEqual([]);
      expect(r.data.calendar).toEqual([]);
      expect(r.data.sprayWindows).toEqual([]);
    }
  });

  it("fails the request when the body is not an object", () => {
    for (const bad of [null, undefined, "x", 3, []]) {
      expect(() => readAgriculture(bad)).toThrow(ApiError);
    }
  });

  it("throws the Worker's sentence on a 422 (a bad point)", async () => {
    mockFetch({ status: 422, body: errorInvalid });
    await expect(fetchAgriculture(HARARE, [])).rejects.toMatchObject({
      status: 422,
    });
  });

  it("throws on a network error", async () => {
    mockFetch({ networkError: new Error("offline") });
    await expect(fetchAgriculture(HARARE, [])).rejects.toThrow("offline");
  });
});

describe("GET /v1/enso", () => {
  it("reads the recorded El Niño reading", async () => {
    const calls = mockFetch({ body: ensoFixture });
    const result = await fetchEnso();
    expect(calls[0].url).toBe(`${BASE}/v1/enso`);
    expect(result.kind).toBe("ready");
    if (result.kind === "ready") {
      expect(result.data.phase).toBe("El Niño");
      expect(result.data.oni).toBe(2.16);
      expect(result.data.strength).toBe("very strong");
      expect(result.data.series).toHaveLength(6);
    }
  });

  it("reads available:false as unavailable", async () => {
    mockFetch({ body: { available: false, series: [], source: "NOAA CPC ONI" } });
    expect(await fetchEnso()).toEqual({ kind: "unavailable" });
  });

  it("fails the request when the body is not an object", () => {
    expect(() => readEnso("nope")).toThrow(ApiError);
  });
});

describe("GET /v1/locations/profile", () => {
  beforeEach(() => resetPlaceProfileCache());

  it("builds the query: slug first, rounded point, a two-letter country only", () => {
    expect(profileQuery({ slug: "harare" })).toEqual({ slug: "harare" });
    expect(profileQuery({ slug: "a b", lat: -17.83123, lon: 31.05 })).toEqual({
      slug: "a b",
      lat: "-17.8312",
      lon: "31.0500",
    });
    expect(
      profileQuery({ slug: "nairobi-ke", lat: -1.28, lon: 36.81, country: "KE" }),
    ).toEqual({
      slug: "nairobi-ke",
      lat: "-1.2800",
      lon: "36.8100",
      country: "KE",
    });
    expect(profileQuery({ slug: "x", lat: 1, lon: 2, country: "Kenya" })).not.toHaveProperty(
      "country",
    );
  });

  it("asks by point alone for a place with no slug, and keys it to about a kilometre", () => {
    expect(profileQuery({ lat: -17.76, lon: 31.06 })).toEqual({
      lat: "-17.7600",
      lon: "31.0600",
    });
    expect(profileKey({ slug: "harare" })).toBe("harare");
    expect(profileKey({ lat: -17.7601, lon: 31.0599 })).toBe("@-17.76,31.06");
  });

  it("caches an answer and shares one in-flight request", async () => {
    const calls = mockFetch({ body: profileHarare });
    const [a, b] = await Promise.all([
      fetchPlaceProfile(HARARE),
      fetchPlaceProfile(HARARE),
    ]);
    expect(a.current?.season?.localName).toBe("Masika");
    expect(b).toBe(a);
    expect(calls).toHaveLength(1);
    await fetchPlaceProfile(HARARE);
    expect(calls).toHaveLength(1);
    expect(peekPlaceProfile("harare")).toBe(a);
    expect(calls[0].url).toBe(
      `${BASE}/v1/locations/profile?slug=harare&lat=-17.8300&lon=31.0500&country=ZW`,
    );
  });

  it("never ties the shared request to one caller's abort signal", async () => {
    const calls = mockFetch({ body: profileHarare });
    await fetchPlaceProfile(HARARE);
    expect(calls[0].signal ?? undefined).toBeUndefined();
  });

  it("expires after 30 minutes", async () => {
    mockFetch({ body: profileHarare });
    await fetchPlaceProfile(HARARE);
    expect(peekPlaceProfile("harare", Date.now() + 1000)).toBeDefined();
    expect(
      peekPlaceProfile("harare", Date.now() + PLACE_PROFILE_TTL_MS + 1000),
    ).toBeUndefined();
  });

  it("rejects on a failed request and on a body that is not a profile, caching nothing", async () => {
    mockFetch({ status: 404, body: { error: "not_found" } });
    await expect(fetchPlaceProfile({ slug: "x" })).rejects.toMatchObject({
      status: 404,
    });
    mockFetch({ body: { nope: true } });
    await expect(fetchPlaceProfile({ slug: "x" })).rejects.toThrow(
      "could not be read",
    );
    expect(peekPlaceProfile("x")).toBeUndefined();
  });
});

describe("GET /v1/history and /v1/normals for the 30-day card", () => {
  it("asks for 30 days of a place and reads the recorded answer", async () => {
    const calls = mockFetch({ body: historyHarare });
    const answer = await fetchHistory30("harare");
    expect(calls[0].url).toBe(`${BASE}/v1/history?location=harare&days=30`);
    expect(answer.data).toHaveLength(8);
    expect(answer.degraded).toBe(false);
  });

  it("tries a short range once more after a network error", async () => {
    const calls = mockFetch(
      { networkError: new Error("offline") },
      { body: historyHarare },
    );
    const answer = await fetchHistory30("harare");
    expect(calls).toHaveLength(2);
    expect(answer.data).toHaveLength(8);
  });

  it("gives up after the second failure", async () => {
    const calls = mockFetch(
      { networkError: new Error("offline") },
      { networkError: new Error("still offline") },
    );
    await expect(fetchHistory30("harare")).rejects.toThrow("still offline");
    expect(calls).toHaveLength(2);
  });

  it("does not retry once the caller has left", async () => {
    const controller = new AbortController();
    controller.abort();
    const calls = mockFetch({ body: historyHarare });
    await expect(fetchHistory30("harare", controller.signal)).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });

  it("reads one day's normals at a rounded point", async () => {
    const calls = mockFetch({ body: normalsHarare });
    expect(await fetchNormalsOn(-17.8312, 31.0512, "2026-11-01")).toEqual({
      available: true,
      normalHigh: 28.6,
      normalLow: 16.2,
    });
    expect(calls[0].url).toBe(
      `${BASE}/v1/normals?lat=-17.831&lon=31.051&date=2026-11-01`,
    );
  });

  it("reads a failed normals request as no normals, so the card keeps what it has", async () => {
    mockFetch({ status: 500, body: { error: "boom" } });
    expect(await fetchNormalsOn(0, 0, "2026-11-01")).toEqual({
      available: false,
    });
  });

  it("averages the two ends of the window, asking in order", async () => {
    const calls = mockFetch(
      { body: normalsHarare },
      { body: { ...normalsHarare, normalHigh: 26, normalLow: 14 } },
    );
    const now = Date.UTC(2026, 10, 1, 12);
    expect(await fetchWindowNormals(-17.83, 31.05, undefined, now)).toEqual({
      available: true,
      normalHigh: 27.3,
      normalLow: 15.1,
    });
    expect(calls.map((c) => new URL(c.url).searchParams.get("date"))).toEqual([
      "2026-11-01",
      "2026-10-03",
    ]);
  });

  it("asks once when the first end has no normals", async () => {
    const calls = mockFetch({ body: { available: false } });
    expect(await fetchWindowNormals(0, 0)).toEqual({ available: false });
    expect(calls).toHaveLength(1);
  });
});
