import {
  displayNameFromSlug,
  isLocationSlug,
  slugToDisplayName,
} from "./current-slug";

describe("isLocationSlug", () => {
  it("accepts real slugs, including smart slugs", () => {
    expect(isLocationSlug("harare")).toBe(true);
    expect(isLocationSlug("nairobi-ke")).toBe(true);
    expect(isLocationSlug("west-paddock--ksy4dd7")).toBe(true);
  });

  it("rejects app route names, bad syntax and non-strings", () => {
    for (const v of [
      "explore",
      "locations",
      "my",
      "map",
      "Harare",
      "a b",
      "",
      4,
      null,
    ]) {
      expect(isLocationSlug(v)).toBe(false);
    }
  });
});

describe("displayNameFromSlug", () => {
  it("title-cases and drops the country suffix, hash and smart-slug ref", () => {
    expect(displayNameFromSlug("harare")).toBe("Harare");
    expect(displayNameFromSlug("dar-es-salaam-tz")).toBe("Dar Es Salaam");
    expect(displayNameFromSlug("bulawayo-e7b1f4")).toBe("Bulawayo");
    expect(displayNameFromSlug("west-paddock--ksy4dd7")).toBe("West Paddock");
  });

  it("slugToDisplayName drops collision suffixes", () => {
    expect(slugToDisplayName("harare-2")).toBe("Harare");
  });
});
