/**
 * The place under a weather answer: what the farm and place cards ask the
 * Worker about, and when the Weather tab lets them start.
 */

import { type LocationSummary } from "@/api/locations";
import {
  placeOf,
  placeOfSummary,
  weatherForPage,
  withPlace,
} from "@/api/place";
import { type WeatherResponse } from "@/api/weather";

const bare = { current: { temperature: 20 } } as unknown as WeatherResponse;

const named: LocationSummary = {
  slug: "harare",
  name: "Harare",
  province: "Harare",
  country: "ZW",
  lat: -17.8292,
  lon: 31.0522,
  elevation: 1490,
  source: "seed",
};

const fix = { lat: -17.825234, lon: 31.033512 };

describe("placeOf", () => {
  it("reads the place under an answer, and nothing when the answer names none", () => {
    expect(placeOf(bare, "Here")).toBeNull();
    const withLocation = withPlace(bare, fix, named);
    expect(placeOf(withLocation, "Harare")).toMatchObject({
      slug: "harare",
      name: "Harare",
      country: "ZW",
    });
    expect(
      placeOf(
        {
          ...bare,
          location: { lat: Number.NaN, lon: 1 },
        } as WeatherResponse,
        "x",
      ),
    ).toBeNull();
  });

  it("converts a named place the same way", () => {
    expect(placeOfSummary(named)).toMatchObject({
      slug: "harare",
      lat: -17.8292,
      elevation: 1490,
    });
  });
});

describe("withPlace", () => {
  it("puts the named place on a GPS answer, or just the point when it has no name", () => {
    expect(withPlace(bare, fix, named).location).toMatchObject({
      slug: "harare",
      name: "Harare",
    });
    expect(withPlace(bare, fix, null).location).toEqual({
      lat: fix.lat,
      lon: fix.lon,
    });
  });

  it("leaves an answer that already carries a place alone", () => {
    const carried = withPlace(bare, fix, named);
    expect(withPlace(carried, { lat: 1, lon: 2 }, null)).toBe(carried);
  });
});

describe("weatherForPage (when the Weather tab lets the place cards start)", () => {
  it("passes the answer through, with no place, until the geo lookup has settled", () => {
    expect(weatherForPage(bare, null)).toBe(bare);
    // A fix with no place yet: the cards would start from the bare point and
    // then start again once it is named. They wait.
    const waiting = weatherForPage(bare, { ...fix, settled: false });
    expect(waiting).toBe(bare);
    expect(placeOf(waiting, "Here")).toBeNull();
    expect(weatherForPage(bare, fix)).toBe(bare);
  });

  it("draws the place cards for the named place once it has settled", () => {
    const settled = weatherForPage(bare, {
      ...fix,
      place: named,
      settled: true,
    });
    expect(placeOf(settled, "Harare")).toMatchObject({
      slug: "harare",
      country: "ZW",
    });
  });

  it("draws them for the point when the lookup settled without a name", () => {
    const settled = weatherForPage(bare, {
      ...fix,
      place: null,
      settled: true,
    });
    expect(settled.location).toEqual({ lat: fix.lat, lon: fix.lon });
  });
});
