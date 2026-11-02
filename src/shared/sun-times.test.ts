/**
 * Sunrise, sunset and daylight in the place's own clock, with the web's
 * `SunTimes` behaviour, and the phone's zone made hostile.
 */

import { inViewerZone } from "@/test-utils/viewer-zone";
import { sunTimes } from "./sun-times";

const HARARE = 7200;
const SINGAPORE = 28800;

describe("sunTimes", () => {
  it("reads naive local strings as the place's wall clock", () => {
    const t = sunTimes(
      { sunrise: ["2026-10-08T05:46"], sunset: ["2026-10-08T18:11"] },
      HARARE,
    );
    expect(t.sunrise).toBe("05:46");
    expect(t.sunset).toBe("18:11");
    expect(t.daylight).toBe("12h 25m");
    expect(t.sunriseSpoken).toBe("Sunrise at 05:46");
    expect(t.daylightSpoken).toBe("12 hours and 25 minutes of daylight");
    expect(t.hasDaylight).toBe(true);
  });

  it("moves zoned instants to the place's offset", () => {
    const t = sunTimes(
      {
        sunrise: ["2026-10-07T22:57:00Z"],
        sunset: ["2026-10-08T11:03:00Z"],
      },
      SINGAPORE,
    );
    expect(t.sunrise).toBe("06:57");
    expect(t.sunset).toBe("19:03");
    expect(t.daylight).toBe("12h 6m");
  });

  it("never reads 60 minutes (the web rounded minutes after splitting the hours)", () => {
    // 11 h 59 min 40 s of daylight.
    const t = sunTimes(
      {
        sunrise: ["2026-10-08T06:00:00"],
        sunset: ["2026-10-08T17:59:40"],
      },
      HARARE,
    );
    expect(t.daylight).toBe("12h 0m");
  });

  it("says unavailable, not a made-up time, when a time is missing", () => {
    const t = sunTimes({ sunrise: [], sunset: ["2026-10-08T18:11"] }, HARARE);
    expect(t.sunrise).toBe("--:--");
    expect(t.sunset).toBe("18:11");
    expect(t.daylight).toBe("--");
    expect(t.sunriseSpoken).toBe("Sunrise unavailable");
    expect(t.daylightSpoken).toBe("Daylight unavailable");
    expect(t.hasDaylight).toBe(false);
    expect(sunTimes(undefined, HARARE).sunrise).toBe("--:--");
  });

  it("treats a sunset before the sunrise as no daylight", () => {
    const t = sunTimes(
      { sunrise: ["2026-10-08T18:00"], sunset: ["2026-10-08T06:00"] },
      HARARE,
    );
    expect(t.daylight).toBe("--");
  });
});

inViewerZone("Australia/Perth", 480, () => {
  it("shows Harare's sunrise whatever zone the phone is in", () => {
    const t = sunTimes(
      { sunrise: ["2026-10-08T05:46"], sunset: ["2026-10-08T18:11"] },
      HARARE,
      new Date(Date.UTC(2026, 9, 8, 6, 30)),
    );
    expect(t.sunrise).toBe("05:46");
    expect(t.sunset).toBe("18:11");
  });
});
