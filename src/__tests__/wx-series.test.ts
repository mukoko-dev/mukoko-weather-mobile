/**
 * The chart series colours are the web's weather-convention colours
 * (mukoko-weather `--wx-series-*`), legible on the card in both themes, and
 * every series is a different colour in each theme (the web's own checks).
 */

import { contrastRatio, DARK, LIGHT, WX_UV, uvBandIndex } from "@/theme/mzizi";
import {
  WX_SERIES_DARK,
  WX_SERIES_LIGHT,
  seriesColors,
} from "@/theme/wx-series";

describe("series colours", () => {
  it.each([
    ["light", WX_SERIES_LIGHT, LIGHT.card],
    ["dark", WX_SERIES_DARK, DARK.card],
  ] as const)("hold 3:1 on the %s card", (_name, series, card) => {
    for (const [key, hex] of Object.entries(series)) {
      expect(contrastRatio(hex, card)).toBeGreaterThanOrEqual(3);
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      expect(key.length).toBeGreaterThan(0);
    }
  });

  it("gives every series its own colour in each theme", () => {
    for (const series of [WX_SERIES_LIGHT, WX_SERIES_DARK]) {
      const hexes = Object.values(series);
      expect(new Set(hexes).size).toBe(hexes.length);
    }
  });

  it("has the same series in both themes", () => {
    expect(Object.keys(WX_SERIES_DARK)).toEqual(Object.keys(WX_SERIES_LIGHT));
  });

  it("pins the web's values for the series the charts use", () => {
    expect(WX_SERIES_LIGHT.temp).toBe("#d73027");
    expect(WX_SERIES_LIGHT.tempLow).toBe("#4575b4");
    expect(WX_SERIES_LIGHT.rainProb).toBe("#08519c");
    expect(WX_SERIES_LIGHT.wind).toBe("#2a9d8f");
    expect(WX_SERIES_DARK.temp).toBe("#f4806f");
    expect(WX_SERIES_DARK.humidity).toBe("#74c476");
  });

  it("follows the colour scheme", () => {
    expect(seriesColors(false)).toBe(WX_SERIES_LIGHT);
    expect(seriesColors(true)).toBe(WX_SERIES_DARK);
  });

  it("colours UV bars from the WHO scale, not a series colour", () => {
    expect(WX_UV[uvBandIndex(1)]).toBe("#299501");
    expect(WX_UV[uvBandIndex(9)]).toBe("#d8001d");
    expect(WX_UV[uvBandIndex(12)]).toBe("#6b49c8");
  });
});
