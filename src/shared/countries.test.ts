/** The static country names that replace Intl.DisplayNames on Hermes (#72). */

import { COUNTRY_NAMES, countryName } from "@/shared/countries";
import { LOCATIONS } from "@/shared/locations";

describe("COUNTRY_NAMES", () => {
  it("covers every ISO code the app's places use", () => {
    const codes = new Set(
      LOCATIONS.map((l) => (l.country ?? "ZW").toUpperCase()),
    );
    expect(codes.size).toBeGreaterThan(50);
    for (const code of codes) expect(COUNTRY_NAMES[code]).toBeTruthy();
  });

  it("reads codes in any case, and nothing for a non-country", () => {
    expect(countryName("zw")).toBe("Zimbabwe");
    expect(countryName(" KE ")).toBe("Kenya");
    expect(countryName("ZZ")).toBeUndefined();
    expect(countryName(undefined)).toBeUndefined();
  });

  it("holds only two-letter codes", () => {
    for (const code of Object.keys(COUNTRY_NAMES)) {
      expect(code).toMatch(/^[A-Z]{2}$/);
    }
  });
});
