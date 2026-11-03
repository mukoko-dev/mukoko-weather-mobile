/**
 * The event vocabulary: only closed-set values and coarse places survive, by
 * type (the @ts-expect-error lines fail `tsc` if a type ever loosens) and at
 * runtime (`validateEvent`).
 */

import {
  activitySlug,
  coarsePlace,
  countryCode,
  EVENT_NAMES,
  minuteStamp,
  validateEvent,
  type CoarsePlace,
  type EventProps,
} from "@/analytics/events";
import { CELL_CHARS, encodeCell } from "@/analytics/geohash";

describe("geohash cell", () => {
  it("matches the published reference vectors, cut to four characters", () => {
    expect(encodeCell(57.64911, 10.40744)).toBe("u4pr"); // u4pruydqqvj
    expect(encodeCell(42.6, -5.6)).toBe("ezs4"); // ezs42
    // The web's smart slug for Harare is harare--ksy4dd7.
    expect(encodeCell(-17.8292, 31.0522)).toBe("ksy4");
  });

  it("is never finer than four characters (about 39 x 20 km)", () => {
    expect(CELL_CHARS).toBe(4);
    expect(encodeCell(1.3521, 103.8198)).toHaveLength(4);
  });

  it("refuses a missing or impossible coordinate", () => {
    expect(encodeCell(undefined, 31)).toBeUndefined();
    expect(encodeCell(91, 31)).toBeUndefined();
    expect(encodeCell(-17, 181)).toBeUndefined();
    expect(encodeCell(Number.NaN, 31)).toBeUndefined();
  });
});

describe("coarse place", () => {
  it("keeps a country code and a cell, never the coordinate", () => {
    const place = coarsePlace({ lat: -17.8292, lon: 31.0522, country: "zw" });
    expect(place).toEqual({ country: "ZW", cell: "ksy4" });
    expect(JSON.stringify(place)).not.toMatch(/17\.8|31\.0/);
  });

  it("drops a country name: only ISO 3166-1 alpha-2 codes pass", () => {
    expect(countryCode("Zimbabwe")).toBeUndefined();
    expect(countryCode("ZWE")).toBeUndefined();
    expect(countryCode(" sg ")).toBe("SG");
    expect(coarsePlace({ country: "Zimbabwe" })).toBeUndefined();
  });
});

describe("validateEvent", () => {
  it("accepts every event in the vocabulary in its documented shape", () => {
    const place = coarsePlace({ lat: -17.83, lon: 31.05, country: "ZW" });
    const samples: { [K in keyof EventProps]: EventProps[K] } = {
      first_open: { origin: "install" },
      forecast_shown: { surface: "home", place },
      place_saved: { method: "search", savedCount: 3, place },
      activity_selected: { activity: activitySlug("farming")!, enabled: true },
      report_submitted: { reportType: "hail", severity: "severe", place },
      push_enabled: { granted: false },
      share: { surface: "forecast" },
      upgrade_viewed: { surface: "map" },
    };
    expect(Object.keys(samples).sort()).toEqual([...EVENT_NAMES].sort());
    for (const [name, props] of Object.entries(samples)) {
      expect(validateEvent(name, props)).toEqual({ name, props });
    }
  });

  it("rejects an unknown event name", () => {
    expect(validateEvent("search_typed", { surface: "home" })).toBeNull();
    expect(validateEvent(42, {})).toBeNull();
  });

  it("rejects free text in any field", () => {
    // A key the schema does not name, carrying what a person typed.
    expect(
      validateEvent("forecast_shown", { surface: "home", query: "my farm" }),
    ).toBeNull();
    // Free text where an enum belongs.
    expect(
      validateEvent("share", { surface: "Bryan's farm, Ruwa" }),
    ).toBeNull();
    // A sentence where an activity slug belongs.
    expect(
      validateEvent("activity_selected", {
        activity: "picking tomatoes with gogo",
        enabled: true,
      }),
    ).toBeNull();
    // A place name smuggled in as a cell.
    expect(
      validateEvent("forecast_shown", {
        surface: "place",
        place: { cell: "harare" },
      }),
    ).toBeNull();
  });

  it("rejects a place finer than the cell, or with a coordinate in it", () => {
    expect(
      validateEvent("forecast_shown", {
        surface: "place",
        place: { cell: "ksy4d" },
      }),
    ).toBeNull();
    expect(
      validateEvent("forecast_shown", {
        surface: "place",
        place: { cell: "ksy4", lat: -17.83, lon: 31.05 },
      }),
    ).toBeNull();
    expect(
      validateEvent("place_saved", {
        method: "gps",
        savedCount: 1,
        place: { country: "Zimbabwe" },
      }),
    ).toBeNull();
  });

  it("rejects a missing field and a number out of range", () => {
    expect(validateEvent("place_saved", { method: "gps" })).toBeNull();
    expect(
      validateEvent("place_saved", { method: "gps", savedCount: 11 }),
    ).toBeNull();
    expect(
      validateEvent("place_saved", { method: "gps", savedCount: 1.5 }),
    ).toBeNull();
    expect(validateEvent("push_enabled", { granted: "yes" })).toBeNull();
  });
});

describe("minuteStamp", () => {
  it("keeps the minute, not the second", () => {
    expect(minuteStamp(new Date("2026-11-02T09:41:37.512Z"))).toBe(
      "2026-11-02T09:41:00.000Z",
    );
  });
});

// Never called: `tsc --noEmit` checks that free text does not type-check.
export function typeLevelChecks(): void {
  const props = {} as EventProps;
  const typed: string = "ZW";
  // @ts-expect-error an unchecked string is not a cell (coarsePlace makes one)
  props.forecast_shown = { surface: "home", place: { cell: typed } };
  // @ts-expect-error an unchecked string is not a country (countryCode makes one)
  const country: CoarsePlace = { country: typed };
  // @ts-expect-error an unchecked string is not an activity (activitySlug makes one)
  props.activity_selected = { activity: typed, enabled: true };
  // @ts-expect-error not one of the surfaces
  props.share = { surface: "my farm" };
  // @ts-expect-error no field for a search query
  props.forecast_shown = { surface: "home", query: "harare" };
  void country;
}
