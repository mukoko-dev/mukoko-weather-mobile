/**
 * Places: search, one place by slug, and the place under a coordinate, against
 * answers recorded from weather-api.mukoko.com on 2026-11-01 (GET reads only).
 * Nothing here touches the network.
 */

import { ApiError } from "@/api/client";
import {
  fetchLocation,
  geoLookup,
  searchLocations,
  toLocationSummary,
} from "@/api/locations";
import { mockFetch } from "@/api/mock-fetch";

import errorInvalid from "./__fixtures__/error-invalid-request.json";
import errorNotFound from "./__fixtures__/error-not-found.json";
import geoAutocreate from "./__fixtures__/geo-autocreate-milton-park.json";
import geoSeed from "./__fixtures__/geo-seed-harare.json";
import locationHarare from "./__fixtures__/location-harare.json";
import searchHarare from "./__fixtures__/search-harare.json";

const BASE = "https://weather-api.mukoko.com";

describe("toLocationSummary", () => {
  it("reads the Worker's place into the app's summary", () => {
    expect(toLocationSummary(locationHarare.location)).toEqual({
      slug: "harare",
      name: "Harare",
      province: "Harare",
      country: "ZW",
      lat: -17.83,
      lon: 31.05,
      elevation: 1490,
      tags: ["city", "education"],
      source: "seed",
      area: undefined,
    });
  });

  it("carries the area flag of a country or region", () => {
    const area = toLocationSummary({
      slug: "zimbabwe--kwek",
      name: "Zimbabwe",
      lat: -19,
      lon: 29.8,
      area: "country",
    });
    expect(area?.area).toBe("country");
  });

  it("turns an empty province into none", () => {
    expect(
      toLocationSummary({ slug: "a", name: "A", province: "", lat: 1, lon: 2 })
        ?.province,
    ).toBeUndefined();
  });

  it.each([
    null,
    "harare",
    {},
    { slug: "a", name: "A", lat: 1 },
    { slug: "a", lat: 1, lon: 2 },
    { name: "A", lat: 1, lon: 2 },
    { slug: "a", name: "A", lat: "1", lon: 2 },
    { slug: "a", name: "A", lat: Infinity, lon: 2 },
  ])("drops %j", (raw) => {
    expect(toLocationSummary(raw)).toBeNull();
  });
});

describe("fetchLocation", () => {
  it("asks /v1/locations for the slug", async () => {
    const calls = mockFetch({ body: locationHarare });
    const place = await fetchLocation("harare");
    expect(calls[0].url).toBe(`${BASE}/v1/locations?slug=harare`);
    expect(place.name).toBe("Harare");
    expect(place.lat).toBe(-17.83);
  });

  it("fails with the Worker's 404 for an unknown place", async () => {
    mockFetch({ status: 404, body: errorNotFound });
    await expect(fetchLocation("zzz-not-a-place")).rejects.toMatchObject({
      status: 404,
      message: "Location not found",
    });
  });

  it("refuses an answer with no usable place", async () => {
    mockFetch({ body: { location: { slug: "x", name: "X" } } });
    const err = await fetchLocation("x").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(502);
  });
});

describe("searchLocations", () => {
  it("asks /v1/search and converts `locations` to `results`", async () => {
    const calls = mockFetch({ body: searchHarare });
    const res = await searchLocations("harare");
    expect(calls[0].url).toBe(`${BASE}/v1/search?q=harare`);
    expect(res.total).toBe(3);
    expect(res.results.map((r) => r.slug)).toEqual([
      "harare",
      "chitungwiza",
      "epworth",
    ]);
    expect(res.results[0]).toMatchObject({
      name: "Harare",
      province: "Harare",
      country: "ZW",
    });
  });

  it("passes the abort signal to the request", async () => {
    const calls = mockFetch({ body: searchHarare });
    const controller = new AbortController();
    await searchLocations("harare", controller.signal);
    expect(calls[0].signal).toBe(controller.signal);
  });

  it("drops entries that are not places and tolerates an empty answer", async () => {
    mockFetch(
      {
        body: {
          locations: [
            { slug: "ok", name: "OK", lat: 1, lon: 2 },
            { slug: "bad" },
          ],
          total: 2,
        },
      },
      { body: {} },
    );
    expect((await searchLocations("o")).results.map((r) => r.slug)).toEqual([
      "ok",
    ]);
    expect(await searchLocations("none")).toEqual({
      results: [],
      total: undefined,
    });
  });

  it("surfaces the Worker's 400 sentence", async () => {
    mockFetch({ status: 400, body: errorInvalid });
    await expect(searchLocations("")).rejects.toMatchObject({
      status: 400,
      message: "Provide q (search query) or tag (filter)",
    });
  });
});

describe("geoLookup", () => {
  it("finds the nearest place without asking the Worker to name a new one", async () => {
    const calls = mockFetch({ body: geoSeed });
    const res = await geoLookup(-17.83, 31.05);
    expect(calls[0].url).toBe(`${BASE}/v1/geo?lat=-17.83&lon=31.05`);
    expect(calls[0].url).not.toContain("autoCreate");
    expect(res.location?.slug).toBe("harare");
    expect(res.isNew).toBe(false);
    expect(res.synthesized).toBe(false);
  });

  it("names the exact spot under a GPS fix with autoCreate=true, a GET that stores nothing", async () => {
    const calls = mockFetch({ body: geoAutocreate });
    const res = await geoLookup(-17.8252, 31.0335, true);
    expect(calls[0].method).toBe("GET");
    expect(calls[0].body).toBeUndefined();
    expect(calls[0].url).toBe(
      `${BASE}/v1/geo?lat=-17.8252&lon=31.0335&autoCreate=true`,
    );
    expect(res.location).toMatchObject({
      slug: "milton-park--ksy4d5j",
      name: "Milton Park",
      province: "Harare",
      country: "ZW",
    });
    expect(res.isNew).toBe(true);
  });

  it("flags a place that has no record and is read from its own slug", async () => {
    mockFetch({
      body: {
        nearest: {
          slug: "12-35n-45-62e--s0k2m4p",
          name: "12.35°N 45.62°E",
          lat: 12.35,
          lon: 45.62,
          elevationApproximate: true,
          namingSkipped: true,
        },
        redirectTo: "/12-35n-45-62e--s0k2m4p",
        isNew: false,
        synthesized: true,
      },
    });
    const res = await geoLookup(12.35, 45.62, true);
    expect(res.synthesized).toBe(true);
    expect(res.location?.slug).toBe("12-35n-45-62e--s0k2m4p");
  });

  it("answers no place, not an error, on a 404", async () => {
    mockFetch({ status: 404, body: errorNotFound });
    expect(await geoLookup(0, 0)).toEqual({
      location: null,
      isNew: false,
      synthesized: false,
    });
  });

  it("lets every other failure through", async () => {
    mockFetch({
      status: 429,
      body: { error: "rate_limited", error_description: "Slow down." },
    });
    await expect(geoLookup(1, 2, true)).rejects.toMatchObject({ status: 429 });
  });
});
