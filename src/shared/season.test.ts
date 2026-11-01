import profileHarare from "@/api/__fixtures__/profile-harare.json";
import profileLondon from "@/api/__fixtures__/profile-london.json";

import type { PlaceProfile } from "./place-knowledge";
import {
  defaultSeasonAt,
  resolveSeason,
  seasonFromProfile,
  seasonLine,
  seasonRowValue,
} from "./season";

const harare = profileHarare as unknown as PlaceProfile;
const london = profileLondon as unknown as PlaceProfile;

describe("seasonLine (the web's SeasonBadge rule)", () => {
  it("leads with the local name and follows with the English name and description", () => {
    expect(
      seasonLine({
        name: "Main rains",
        localName: "Masika",
        description: "Flooding, road damage, planting",
      }),
    ).toEqual({
      title: "Masika",
      detail: "Main rains — Flooding, road damage, planting",
    });
  });

  it("uses the name and the bare description when there is no distinct local name", () => {
    expect(
      seasonLine({
        name: "Winter",
        localName: "Winter",
        description: "Coldest season with shorter days",
      }),
    ).toEqual({ title: "Winter", detail: "Coldest season with shorter days" });
    expect(
      seasonLine({ name: "Winter", localName: "", description: "Cold" }).title,
    ).toBe("Winter");
  });
});

describe("defaultSeasonAt reads the month it is given, not the phone's clock", () => {
  it("follows the web's hemisphere table", () => {
    expect(defaultSeasonAt(1, -17.8).name).toBe("Summer");
    expect(defaultSeasonAt(4, -17.8).name).toBe("Autumn");
    expect(defaultSeasonAt(7, -17.8).name).toBe("Winter");
    expect(defaultSeasonAt(10, -17.8).name).toBe("Spring");
    expect(defaultSeasonAt(1, 51.5).name).toBe("Winter");
    expect(defaultSeasonAt(4, 51.5).name).toBe("Spring");
    expect(defaultSeasonAt(7, 51.5).name).toBe("Summer");
    expect(defaultSeasonAt(10, 51.5).name).toBe("Autumn");
  });

  it("covers every month and clamps a bad one", () => {
    for (let m = 1; m <= 12; m++) {
      expect(defaultSeasonAt(m, 10).description.length).toBeGreaterThan(0);
    }
    expect(defaultSeasonAt(0, 10)).toEqual(defaultSeasonAt(1, 10));
    expect(defaultSeasonAt(13, 10)).toEqual(defaultSeasonAt(12, 10));
  });
});

describe("the season from a place profile", () => {
  it("reads Harare's verified local calendar", () => {
    const r = seasonFromProfile(harare)!;
    expect(r.season).toEqual({
      name: "Main rains",
      localName: "Masika",
      description: "Flooding, road damage, planting",
    });
    expect(r.estimated).toBe(false);
    expect(seasonRowValue(r)).toBe("Masika (Main rains)");
  });

  it("marks London's derived season as estimated and keeps the name when there is no local one", () => {
    const r = seasonFromProfile(london)!;
    expect(r.season.name).toBe("Autumn");
    expect(r.season.localName).toBe("Autumn");
    expect(r.season.description).toBe("Meteorological season");
    expect(r.estimated).toBe(true);
    expect(seasonRowValue(r)).toBe("Autumn, estimated");
  });

  it("is null without a profile or without a current season", () => {
    expect(seasonFromProfile(null)).toBeNull();
    expect(seasonFromProfile(undefined)).toBeNull();
    expect(seasonFromProfile({ ...harare, current: null })).toBeNull();
  });
});

describe("resolveSeason", () => {
  it("prefers the profile", () => {
    expect(resolveSeason(harare, 11, -17.8).season.localName).toBe("Masika");
  });

  it("falls back to the hemisphere default for the place's month, marked estimated", () => {
    const r = resolveSeason(null, 11, -17.8);
    expect(r.season.name).toBe("Spring");
    expect(r.estimated).toBe(true);
    expect(seasonRowValue(r)).toBe("Spring, estimated");
  });
});
