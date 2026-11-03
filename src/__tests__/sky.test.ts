/**
 * The page sky: eight condition families x light/dark x three gradient stops,
 * with white text at 4.5:1 or better on every one (the web's `hero.test.ts`
 * contrast rule, 96 pairs), the owner's mockup values, and the static texture.
 */

import { skyFamily } from "@/shared/hero";
import { contrastRatio } from "@/theme/mzizi";
import {
  NEUTRAL_SKY,
  SKY_FAMILIES,
  SKY_FG,
  SKY_FG_DIM,
  SKY_REACH,
  STARS,
  STREAKS,
  skyReach,
  skyStops,
} from "@/theme/sky";
import { streakPath } from "@/components/weather/WeatherSky";

const STOPS = ["top", "mid", "bottom"] as const;

describe("sky tokens: contrast", () => {
  it("has the eight families the web has", () => {
    expect([...SKY_FAMILIES].sort()).toEqual(
      [
        "clear-day",
        "clear-night",
        "cloudy-day",
        "cloudy-night",
        "fog",
        "rain",
        "snow",
        "storm",
      ].sort(),
    );
  });

  it("keeps white text at WCAG AA 4.5:1 on EVERY gradient stop (8 families x light/dark x 3 stops x 2 whites)", () => {
    let checked = 0;
    const failures: string[] = [];
    for (const family of SKY_FAMILIES) {
      for (const dark of [false, true]) {
        const stops = skyStops(family, dark);
        for (const stop of STOPS) {
          for (const fg of [SKY_FG, SKY_FG_DIM]) {
            const ratio = contrastRatio(stops[stop], fg);
            if (ratio < 4.5) {
              failures.push(
                `${fg} on ${family} ${dark ? "dark" : "light"} ${stop} ${stops[stop]}: ${ratio.toFixed(2)}`,
              );
            }
            checked++;
          }
        }
      }
    }
    expect(failures).toEqual([]);
    expect(checked).toBe(96);
  });

  it("draws the focus ring and glyphs in white at 3:1 on every stop", () => {
    for (const family of SKY_FAMILIES) {
      for (const dark of [false, true]) {
        const stops = skyStops(family, dark);
        for (const stop of STOPS) {
          expect(contrastRatio(stops[stop], SKY_FG)).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it("uses the owner's mockup values for the night and rain skies, in both themes", () => {
    for (const dark of [false, true]) {
      expect(skyStops("clear-night", dark)).toEqual({
        top: "#0b1026",
        mid: "#151c42",
        bottom: "#1c2550",
        midAt: 0.55,
      });
      expect(skyStops("rain", dark)).toEqual({
        top: "#3a4656",
        mid: "#4a5768",
        bottom: "#3e4a5a",
        midAt: 0.45,
      });
    }
  });

  it("makes dark a real dusk design, never lighter than light", () => {
    const luma = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      return (
        0.2126 * ((n >> 16) & 255) +
        0.7152 * ((n >> 8) & 255) +
        0.0722 * (n & 255)
      );
    };
    for (const family of SKY_FAMILIES) {
      for (const stop of STOPS) {
        expect(luma(skyStops(family, true)[stop])).toBeLessThanOrEqual(
          luma(skyStops(family, false)[stop]),
        );
      }
    }
  });

  it("picks the family from the weather code and the hour, as the web does", () => {
    expect(skyFamily(0, true)).toBe("clear-day");
    expect(skyFamily(1, false)).toBe("clear-night");
    expect(skyFamily(3, true)).toBe("cloudy-day");
    expect(skyFamily(3, false)).toBe("cloudy-night");
    expect(skyFamily(45, false)).toBe("fog");
    expect(skyFamily(63, true)).toBe("rain");
    expect(skyFamily(81, false)).toBe("rain");
    expect(skyFamily(73, true)).toBe("snow");
    expect(skyFamily(95, true)).toBe("storm");
    expect(skyFamily(NEUTRAL_SKY === "cloudy-day" ? 3 : 0, true)).toBe(
      NEUTRAL_SKY,
    );
  });
});

describe("sky box and texture", () => {
  it("is a screen and 8rem tall, never under 60rem, and fades over 6rem", () => {
    expect(SKY_REACH).toEqual({ extra: 128, floor: 960, fade: 96 });
    expect(skyReach(852)).toBe(980);
    expect(skyReach(568)).toBe(960);
    expect(skyReach(1366)).toBe(1494);
  });

  it("has the web's ten stars, all inside the box", () => {
    expect(STARS).toHaveLength(10);
    for (const s of STARS) {
      expect(s.x).toBeGreaterThan(0);
      expect(s.x).toBeLessThan(100);
      expect(s.y).toBeGreaterThan(0);
      expect(s.y).toBeLessThan(100);
    }
  });

  it("leans the streaks like the web's 105deg stripes and covers the width", () => {
    const d = streakPath(393);
    const lines = d.split("M").filter(Boolean);
    // One line per ~14.5 dp across the width plus the lean (340 * tan 15 deg).
    expect(lines.length).toBeGreaterThan(30);
    expect(lines.length).toBeLessThan(40);
    const [top, bottom] = lines[1].split("L");
    const x0 = Number(top.split(" ")[0]);
    const x1 = Number(bottom.split(" ")[0]);
    expect(x0 - x1).toBeCloseTo(
      STREAKS.height * Math.tan((15 * Math.PI) / 180),
      0,
    );
  });
});
