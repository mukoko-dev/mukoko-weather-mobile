/**
 * Ported from mukoko-weather `src/lib/aq-grid.test.ts` (the `aqiBand` block)
 * and `src/lib/display.test.ts` (the advice table): same vectors.
 */

import {
  AQI_ADVICE,
  AQI_BANDS,
  AQI_BAND_LABELS,
  aqiBand,
  aqiBandIndex,
} from "./aqi";

describe("aqiBand — EPA breakpoints", () => {
  it.each([
    [0, "good"],
    [50, "good"],
    [51, "moderate"],
    [100, "moderate"],
    [101, "usg"],
    [150, "usg"],
    [151, "unhealthy"],
    [200, "unhealthy"],
    [201, "very_unhealthy"],
    [300, "very_unhealthy"],
    [301, "hazardous"],
    [500, "hazardous"],
  ])("AQI %i → %s", (aqi, band) => {
    expect(aqiBand(aqi)).toBe(band);
  });

  it("rounds to the nearest integer before classifying", () => {
    expect(aqiBand(50.4)).toBe("good");
    expect(aqiBand(50.5)).toBe("moderate");
    expect(aqiBand(100.6)).toBe("usg");
  });

  it("orders bands from lowest to highest severity with labels for each", () => {
    expect(AQI_BANDS).toEqual([
      "good",
      "moderate",
      "usg",
      "unhealthy",
      "very_unhealthy",
      "hazardous",
    ]);
    for (const band of AQI_BANDS) {
      expect(AQI_BAND_LABELS[band].length).toBeGreaterThan(0);
    }
    expect(aqiBandIndex("hazardous")).toBe(5);
  });

  it("has advice for every level, naming the concrete actions where it matters", () => {
    expect(AQI_ADVICE.unhealthy).toMatch(/mask/i);
    expect(AQI_ADVICE.very_unhealthy).toMatch(/indoors/i);
    expect(AQI_ADVICE.hazardous).toMatch(/indoors/i);
    for (const level of Object.keys(AQI_ADVICE)) {
      expect(AQI_ADVICE[level as keyof typeof AQI_ADVICE]).toBeTruthy();
    }
  });
});
