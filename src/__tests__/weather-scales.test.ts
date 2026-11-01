/**
 * The data colours hold the contrast the web holds: every chart series and
 * model line is 3:1 or better against the card in both themes (non-text
 * contrast), the frost blues hold 3:1 against the page, and the six AQI fills
 * are the official EPA colours in order.
 */

import { DARK, LIGHT, contrastRatio } from "@/theme/mzizi";
import {
  WX_AQI,
  WX_FROST,
  WX_MODEL_LINES,
  WX_SERIES,
  aqiFill,
  frostColor,
  modelLineColor,
  seriesColor,
} from "@/theme/weather-scales";

describe("AQI fills", () => {
  it("are the six official US EPA AirNow colours, in band order", () => {
    expect([...WX_AQI]).toEqual([
      "#00e400",
      "#ffff00",
      "#ff7e00",
      "#ff0000",
      "#8f3f97",
      "#7e0023",
    ]);
    expect(aqiFill("good")).toBe("#00e400");
    expect(aqiFill("hazardous")).toBe("#7e0023");
  });
});

describe("chart series", () => {
  it.each([
    ["light", LIGHT],
    ["dark", DARK],
  ] as const)("every %s series is 3:1 against the card", (scheme, page) => {
    for (const [key, hex] of Object.entries(WX_SERIES[scheme])) {
      expect({ key, ratio: contrastRatio(hex, page.card) >= 3 }).toEqual({
        key,
        ratio: true,
      });
    }
  });

  it("is looked up by the OS scheme", () => {
    expect(seriesColor("rain", "light")).toBe(WX_SERIES.light.rain);
    expect(seriesColor("rain", "dark")).toBe(WX_SERIES.dark.rain);
  });
});

describe("model lines", () => {
  it.each([
    ["light", LIGHT],
    ["dark", DARK],
  ] as const)("every %s line is 3:1 against the card", (scheme, page) => {
    for (const hex of WX_MODEL_LINES[scheme]) {
      expect(contrastRatio(hex, page.card)).toBeGreaterThanOrEqual(3);
    }
  });

  it("gives each comparison model its own colour, as the web does", () => {
    const ids = [
      "ecmwf_ifs",
      "ecmwf_aifs025_single",
      "gfs_seamless",
      "icon_global",
    ];
    expect(new Set(ids.map((m) => modelLineColor(m, "light"))).size).toBe(4);
    expect(new Set(ids.map((m) => modelLineColor(m, "dark"))).size).toBe(4);
    // The web: ECMWF chart-1, GFS chart-2, ICON chart-3, AIFS chart-6.
    expect(modelLineColor("ecmwf_ifs", "light")).toBe("#4b0082");
    expect(modelLineColor("ecmwf_aifs025_single", "light")).toBe("#283593");
    expect(modelLineColor("unknown", "light")).toBe(WX_MODEL_LINES.light[4]);
  });
});

describe("frost", () => {
  it("is three blues that hold 3:1 against the page in each theme", () => {
    for (const hex of WX_FROST.light) {
      expect(contrastRatio(hex, LIGHT.background)).toBeGreaterThanOrEqual(3);
    }
    for (const hex of WX_FROST.dark) {
      expect(contrastRatio(hex, DARK.background)).toBeGreaterThanOrEqual(3);
    }
    expect(frostColor("severe", "light")).toBe("#08306b");
    expect(frostColor("moderate", "dark")).toBe("#9ecae1");
  });
});
