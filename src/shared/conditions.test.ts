/**
 * Ported from the pure helpers of mukoko-weather `AtmosphericSummary.tsx`
 * (its tests cover `localIsoDate`, `todayHighFrom` and `aqiTrendSentence`).
 */

import {
  aqiSentence,
  aqiTrendSentence,
  localIsoDate,
  todayHighFrom,
} from "./conditions";
import { type DailyWeather } from "./weather";

describe("aqiTrendSentence", () => {
  it("says how the air compares with yesterday, or nothing", () => {
    expect(aqiTrendSentence("worse")).toBe(
      "Worse than yesterday at this time.",
    );
    expect(aqiTrendSentence("better")).toBe(
      "Better than yesterday at this time.",
    );
    expect(aqiTrendSentence("similar")).toBe(
      "About the same as yesterday at this time.",
    );
    expect(aqiTrendSentence(null)).toBeNull();
    expect(aqiTrendSentence(undefined)).toBeNull();
  });
});

describe("aqiSentence", () => {
  it("names the band, the main pollutant and the trend", () => {
    expect(aqiSentence("moderate", "pm2_5", "worse")).toBe(
      "Moderate, mainly PM2.5. Worse than yesterday at this time.",
    );
    expect(aqiSentence("good", null, null)).toBe("Good.");
  });

  it("says the pollutant in words for a screen reader", () => {
    expect(aqiSentence("usg", "o3", null, true)).toBe(
      "Unhealthy for sensitive groups, mainly ozone.",
    );
  });
});

describe("localIsoDate", () => {
  it("is the place's calendar day, not the phone's", () => {
    // 23:30 UTC on 31 Oct is already 1 Nov in Harare (UTC+2) and 12:30 on 1 Nov in Auckland (UTC+13).
    const now = new Date("2026-10-31T23:30:00Z");
    expect(localIsoDate(now, 7200)).toBe("2026-11-01");
    expect(localIsoDate(now, 13 * 3600)).toBe("2026-11-01");
    expect(localIsoDate(now, -5 * 3600)).toBe("2026-10-31");
  });
});

describe("todayHighFrom", () => {
  it("rounds today's high and is null without one", () => {
    expect(
      todayHighFrom({ temperature_2m_max: [28.6, 30] } as unknown as DailyWeather),
    ).toBe(29);
    expect(todayHighFrom({ temperature_2m_max: [] } as unknown as DailyWeather)).toBeNull();
    expect(todayHighFrom(undefined)).toBeNull();
    expect(
      todayHighFrom({ temperature_2m_max: [NaN] } as unknown as DailyWeather),
    ).toBeNull();
  });
});
