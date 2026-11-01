/**
 * The web's own place-knowledge vectors (mukoko-weather
 * `src/lib/place-knowledge.test.ts`: month runs, short dates and the "About"
 * rows), run against the ported module, plus a recorded Worker answer.
 */

import profileHarare from "@/api/__fixtures__/profile-harare.json";
import profileLondon from "@/api/__fixtures__/profile-london.json";

import {
  monthRange,
  profileRows,
  shortDate,
  type PlaceProfile,
} from "./place-knowledge";

const HARARE: PlaceProfile = {
  climate: {
    koppen: { code: "Cwb", label: "subtropical highland, dry winter" },
  },
  agriculture: null,
  current: {
    month: 10,
    season: { name: "Hot dry", localName: "Zhizha", verified: true },
    nextSeason: {
      name: "Main rains",
      localName: "Masika",
      startsOn: "2026-11-01",
    },
    normalsThisMonth: {
      month: 10,
      meanHighC: 26.5,
      meanLowC: 16.5,
      precipMm: 30,
    },
    cropPhases: [
      {
        crop: "maize",
        cropLabel: "Maize",
        season: null,
        phaseLabel: "Out of season",
        nextPhaseLabel: "Planting to early vegetative",
        nextPhaseOn: "2026-11-01",
      },
    ],
    inDerivedGrowingWindow: null,
  },
};

describe("monthRange", () => {
  it("renders runs, wrapping the year end and never bridging a gap", () => {
    expect(monthRange([5, 6, 7, 8, 9, 10])).toBe("May–Oct");
    expect(monthRange([11, 12, 1, 2, 3])).toBe("Nov–Mar");
    expect(monthRange([3, 4, 5, 10, 11, 12])).toBe("Mar–May, Oct–Dec");
    expect(monthRange([2])).toBe("Feb");
    expect(monthRange([12, 1, 6])).toBe("Jun, Dec–Jan");
    expect(monthRange([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBe("Jan–Dec");
    expect(monthRange([])).toBe("");
    expect(monthRange([0, 13, 4])).toBe("Apr");
  });

  it("shows a two-season window as two ranges in the row", () => {
    const rows = profileRows({
      ...HARARE,
      agriculture: { derived: { months: [3, 4, 5, 10, 11, 12], basis: "x" } },
      current: {
        ...HARARE.current!,
        cropPhases: [],
        inDerivedGrowingWindow: false,
      },
    });
    expect(rows.find((r) => r.label === "Growing window")!.value).toBe(
      "Mar–May, Oct–Dec, now outside it, estimated",
    );
  });
});

describe("shortDate", () => {
  it("formats an ISO date and ignores anything else", () => {
    expect(shortDate("2026-11-01")).toBe("1 Nov");
    expect(shortDate("2027-04-16")).toBe("16 Apr");
    expect(shortDate("soon")).toBe("");
  });
});

describe("profileRows", () => {
  it("shows climate, typical month, next season and crop calendar", () => {
    const rows = profileRows(HARARE);
    expect(rows.map((r) => r.label)).toEqual([
      "Climate zone",
      "Typical in October",
      "Next season",
      "Crop calendar",
    ]);
    expect(rows[0].value).toBe(
      "Subtropical highland, dry winter (Cwb), estimated",
    );
    expect(rows[1].value).toBe("27° high, 17° low, 30 mm of rain");
    expect(rows[2].value).toBe("Masika from 1 Nov");
    expect(rows[3].value).toBe(
      "Maize: out of season, planting to early vegetative from 1 Nov",
    );
  });

  it("marks an unverified season calendar as estimated", () => {
    const rows = profileRows({
      ...HARARE,
      current: {
        ...HARARE.current!,
        season: { name: "Summer", localName: null, verified: false },
      },
    });
    expect(rows.find((r) => r.label === "Next season")!.value).toBe(
      "Masika from 1 Nov, estimated",
    );
  });

  it("names the season of a multi-season crop and caps the list at two", () => {
    const phase = HARARE.current!.cropPhases[0];
    const rows = profileRows({
      ...HARARE,
      current: {
        ...HARARE.current!,
        cropPhases: [
          { ...phase, season: "Long rains" },
          { ...phase, season: "Short rains" },
          { ...phase, cropLabel: "Rice", season: null },
        ],
      },
    });
    const value = rows.find((r) => r.label === "Crop calendar")!.value;
    expect(value).toContain("Maize (long rains)");
    expect(value).toContain("Maize (short rains)");
    expect(value).not.toContain("Rice");
  });

  it("falls back to an estimated growing window, naming no crops", () => {
    const rows = profileRows({
      ...HARARE,
      agriculture: { derived: { months: [5, 6, 7, 8, 9, 10], basis: "x" } },
      current: {
        ...HARARE.current!,
        cropPhases: [],
        inDerivedGrowingWindow: true,
      },
    });
    const row = rows.find((r) => r.label === "Growing window")!;
    expect(row.value).toBe("May–Oct, now inside it, estimated");
    expect(rows.some((r) => r.label === "Crop calendar")).toBe(false);
  });

  it("handles a growing window that wraps the year end", () => {
    const rows = profileRows({
      ...HARARE,
      agriculture: { derived: { months: [11, 12, 1, 2, 3], basis: "x" } },
      current: {
        ...HARARE.current!,
        cropPhases: [],
        inDerivedGrowingWindow: false,
      },
    });
    expect(rows.find((r) => r.label === "Growing window")!.value).toBe(
      "Nov–Mar, now outside it, estimated",
    );
  });

  it("returns nothing without a profile or without current context", () => {
    expect(profileRows(null)).toEqual([]);
    expect(profileRows({ ...HARARE, current: null })).toEqual([]);
  });

  it("skips groups that are missing", () => {
    const rows = profileRows({
      climate: { koppen: null },
      agriculture: null,
      current: {
        ...HARARE.current!,
        normalsThisMonth: null,
        nextSeason: null,
        cropPhases: [],
      },
    });
    expect(rows).toEqual([]);
  });
});


describe("recorded Worker answers", () => {
  it("turns the recorded Harare profile into the four rows", () => {
    const rows = profileRows(profileHarare as unknown as PlaceProfile);
    expect(rows.map((r) => r.label)).toEqual([
      "Climate zone",
      "Typical in November",
      "Next season",
      "Crop calendar",
    ]);
    expect(rows[0].value).toBe(
      "Subtropical highland, dry winter (Cwb), estimated",
    );
    expect(rows[1].value).toBe("27° high, 17° low, 77 mm of rain");
    expect(rows[2].value).toBe("Munakamwe from 1 Apr");
    expect(rows[3].value).toContain("Maize: planting to early vegetative");
  });

  it("names no crops for a place with no crop calendar (London)", () => {
    const rows = profileRows(profileLondon as unknown as PlaceProfile);
    const labels = rows.map((r) => r.label);
    expect(labels).not.toContain("Crop calendar");
    expect(labels).toContain("Growing window");
    const growing = rows.find((r) => r.label === "Growing window")!;
    expect(growing.value).toMatch(/estimated$/);
    expect(growing.value).not.toMatch(/maize|wheat|sorghum/i);
    // A derived calendar is never shown as a verified local fact.
    expect(rows.find((r) => r.label === "Climate zone")!.value).toContain(
      "estimated",
    );
  });
});
