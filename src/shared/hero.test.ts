/**
 * Ported from the web's `src/lib/hero.test.ts`: the same vectors against the
 * same logic, so the mobile hero says what the web hero says. (The web's CSS
 * tests, the sky reach and the class table, stay on the web; the sky colours
 * are tested in src/__tests__/sky.test.ts.)
 */

import {
  currentHourIndex,
  formatHighLow,
  formatHighLowParts,
  heroActivityClause,
  heroBadgeLabel,
  heroEyebrowBadges,
  heroLocalTime,
  heroOutlook,
  isHomeLocation,
  skyFamily,
  skyTexture,
} from "./hero";
import type { HourlyWeather } from "./weather";

describe("heroEyebrowBadges", () => {
  it("shows nothing when the place is neither current nor home", () => {
    expect(heroEyebrowBadges(false, false)).toEqual([]);
  });

  it("shows only MY LOCATION for the GPS-confirmed current place", () => {
    expect(heroEyebrowBadges(true, false)).toEqual(["current"]);
  });

  it("shows only HOME when the place is the saved home but not GPS-confirmed", () => {
    expect(heroEyebrowBadges(false, true)).toEqual(["home"]);
  });

  it("shows both badges, current first, when the place is both", () => {
    expect(heroEyebrowBadges(true, true)).toEqual(["current", "home"]);
  });
});

describe("heroBadgeLabel", () => {
  it("labels the current-location badge My Location", () => {
    expect(heroBadgeLabel("current")).toBe("My Location");
  });

  it("labels the home badge Home", () => {
    expect(heroBadgeLabel("home")).toBe("Home");
  });
});

describe("isHomeLocation", () => {
  it("matches when the slug equals the home slug", () => {
    expect(isHomeLocation("singapore-sg", "singapore-sg")).toBe(true);
  });

  it("does not match a different slug", () => {
    expect(isHomeLocation("harare", "singapore-sg")).toBe(false);
  });

  it("is false when no home is set", () => {
    expect(isHomeLocation("harare", null)).toBe(false);
    expect(isHomeLocation("harare", undefined)).toBe(false);
  });

  it("is false when the page has no slug", () => {
    expect(isHomeLocation(undefined, "harare")).toBe(false);
    expect(isHomeLocation(undefined, null)).toBe(false);
  });
});

describe("formatHighLow", () => {
  it("formats the hero line with two spaces between H and L", () => {
    expect(formatHighLow(34.4, 24.6)).toBe("H:34°  L:25°");
  });

  it("rounds each value to the nearest whole degree", () => {
    expect(formatHighLow(33.5, 25.49)).toBe("H:34°  L:25°");
  });

  it("returns null when either value is missing", () => {
    expect(formatHighLow(undefined, 25)).toBeNull();
    expect(formatHighLow(34, null)).toBeNull();
  });

  it("returns null for non-finite values so NaN never renders", () => {
    expect(formatHighLow(Number.NaN, 25)).toBeNull();
    expect(formatHighLow(34, Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("formatHighLowParts", () => {
  it("splits the line so it can wrap between H and L", () => {
    expect(formatHighLowParts(34.4, 24.6)).toEqual(["H:34°", "L:25°"]);
  });

  it("returns null when either value is missing or not finite (missing is never zero)", () => {
    expect(formatHighLowParts(undefined, 25)).toBeNull();
    expect(formatHighLowParts(34, null)).toBeNull();
    expect(formatHighLowParts(Number.NaN, 25)).toBeNull();
  });
});

describe("heroLocalTime", () => {
  it("reads the clock in the PLACE's offset, never the viewer's", () => {
    const now = new Date("2026-10-31T15:03:00Z");
    expect(heroLocalTime(now, 7200)).toBe("17:03 LOCAL");
    expect(heroLocalTime(now, 28800)).toBe("23:03 LOCAL");
    expect(heroLocalTime(now, -18000)).toBe("10:03 LOCAL");
  });

  it("wraps across midnight and pads", () => {
    expect(heroLocalTime(new Date("2026-10-31T23:30:00Z"), 7200)).toBe(
      "01:30 LOCAL",
    );
  });

  it("is null until there is a client clock", () => {
    expect(heroLocalTime(null, 7200)).toBeNull();
    expect(heroLocalTime(new Date(Number.NaN), 7200)).toBeNull();
  });
});

describe("skyTexture", () => {
  it("puts stars on the night skies and streaks on rain and storms, nothing else", () => {
    expect(skyTexture("clear-night")).toBe("stars");
    expect(skyTexture("cloudy-night")).toBe("stars");
    expect(skyTexture("rain")).toBe("streaks");
    expect(skyTexture("storm")).toBe("streaks");
    for (const f of ["clear-day", "cloudy-day", "fog", "snow"] as const) {
      expect(skyTexture(f)).toBeNull();
    }
  });
});

describe("skyFamily", () => {
  it("maps clear skies to the day or night clear plate", () => {
    expect(skyFamily(0, true)).toBe("clear-day");
    expect(skyFamily(1, true)).toBe("clear-day");
    expect(skyFamily(0, false)).toBe("clear-night");
  });

  it("maps overcast and partly cloudy codes to the cloudy plates", () => {
    expect(skyFamily(2, true)).toBe("cloudy-day");
    expect(skyFamily(3, true)).toBe("cloudy-day");
    expect(skyFamily(3, false)).toBe("cloudy-night");
  });

  it("maps fog and mist to the fog plate at any hour", () => {
    expect(skyFamily(45, true)).toBe("fog");
    expect(skyFamily(48, false)).toBe("fog");
  });

  it("maps drizzle, rain and showers to the rain plate", () => {
    expect(skyFamily(51, true)).toBe("rain");
    expect(skyFamily(63, false)).toBe("rain");
    expect(skyFamily(81, true)).toBe("rain");
  });

  it("maps storms, snow and unknown codes to their families", () => {
    expect(skyFamily(95, false)).toBe("storm");
    expect(skyFamily(73, true)).toBe("snow");
    expect(skyFamily(10, true)).toBe("cloudy-day");
  });
});

/** Hourly series starting at 14:00 local on 8 Oct 2026, 1 hour apart. */
function hourlyFrom(codes: number[]): HourlyWeather {
  const base = new Date(2026, 9, 8, 14, 0, 0);
  const time = codes.map((_, i) => {
    const d = new Date(base.getTime() + i * 3600_000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
  });
  const n = codes.length;
  const zeros = Array(n).fill(0);
  return {
    time,
    temperature_2m: zeros,
    apparent_temperature: zeros,
    relative_humidity_2m: zeros,
    precipitation_probability: zeros,
    precipitation: zeros,
    weather_code: codes,
    wind_speed_10m: zeros,
    wind_gusts_10m: zeros,
    visibility: zeros,
    uv_index: zeros,
    is_day: zeros,
  } as unknown as HourlyWeather;
}

describe("currentHourIndex", () => {
  it("finds the first hour at or after now on the same day", () => {
    const times = ["2026-10-08T13:00", "2026-10-08T14:00", "2026-10-08T15:00"];
    expect(currentHourIndex(times, new Date(2026, 9, 8, 14, 20))).toBe(1);
  });

  it("falls back to the start when no hour matches", () => {
    expect(
      currentHourIndex(["2026-01-01T00:00"], new Date(2026, 9, 8, 14)),
    ).toBe(0);
  });
});

describe("heroOutlook", () => {
  it("returns null without an hourly series", () => {
    expect(heroOutlook(undefined, new Date())).toBeNull();
  });

  it("states when the condition changes, from the deterministic hourly summary", () => {
    // 14:00 clear (0), 15:00 clear, 16:00 rain (63)
    const hourly = hourlyFrom([0, 0, 63, 63, 63, 63]);
    const sentence = heroOutlook(hourly, new Date(2026, 9, 8, 14, 10));
    expect(sentence).toBe("Rain expected around 16:00.");
  });

  it("says the condition will continue when nothing changes", () => {
    const hourly = hourlyFrom([0, 0, 0, 0]);
    expect(heroOutlook(hourly, new Date(2026, 9, 8, 14, 0))).toBe(
      "Clear conditions will continue for the next 4 hours.",
    );
  });
});

describe("heroActivityClause", () => {
  const p = (level: "excellent" | "good" | "fair" | "poor", h: number) => ({
    time: `2026-10-08T${String(h).padStart(2, "0")}:00`,
    level,
  });

  it("returns null when there is no series", () => {
    expect(heroActivityClause([])).toBeNull();
  });

  it("names the hour the rating changes", () => {
    const points = [p("good", 14), p("good", 15), p("fair", 16), p("fair", 17)];
    expect(heroActivityClause(points)).toBe("good until 16:00");
  });

  it("says the rating holds for the whole window when nothing changes", () => {
    const points = [p("excellent", 14), p("excellent", 15), p("excellent", 16)];
    expect(heroActivityClause(points)).toBe("excellent for the next 3 hours");
  });
});
