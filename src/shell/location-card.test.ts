import { type WeatherResponse } from "@/api/weather";

import {
  buildLocationList,
  cardAccessibleName,
  highLowLabel,
  mapWithConcurrency,
  summarizeCard,
  tempLabel,
} from "./location-card";

const NOW = new Date("2026-11-02T12:00:00Z");

function weather(over: Partial<WeatherResponse> = {}): WeatherResponse {
  return {
    current: { temperature: 25.4, weatherCode: 0, isDay: true },
    daily: [{ tempMax: 27.2, tempMin: 16.6 }],
    utcOffsetSeconds: 7200,
    ...over,
  } as WeatherResponse;
}

describe("labels", () => {
  it("rounds temperatures as the web does", () => {
    expect(tempLabel(25.4)).toBe("25°");
    expect(tempLabel(-0.6)).toBe("-1°");
    expect(highLowLabel(27.2, 16.6)).toBe("H:27° L:17°");
  });
});

describe("summarizeCard", () => {
  it("builds a card from a weather answer, on the place's clock", () => {
    const s = summarizeCard(weather(), NOW);
    expect(s).toMatchObject({
      temperature: 25.4,
      high: 27.2,
      low: 16.6,
      condition: "Clear sky",
      family: "clear-day",
      localTime: "14:00",
    });
  });

  it("is null when the answer lacks a field a card needs", () => {
    expect(summarizeCard(null, NOW)).toBeNull();
    expect(summarizeCard(weather({ daily: [] }), NOW)).toBeNull();
  });
});

describe("cardAccessibleName", () => {
  it("reads like the card, badges last", () => {
    const summary = summarizeCard(weather(), NOW);
    expect(cardAccessibleName({ name: "Harare", summary, isHome: true })).toBe(
      "Harare, 25°, Clear sky, high 27 low 17, Home",
    );
    expect(
      cardAccessibleName({ name: "Braeside", summary: null, isCurrent: true }),
    ).toBe("Braeside, Weather unavailable, My location");
  });
});

describe("buildLocationList", () => {
  it("puts My Location first, then saved places once each, capped", () => {
    expect(buildLocationList(["harare", "gweru", "harare", ""], 10)).toEqual([
      { slug: null, isCurrent: true },
      { slug: "harare", isCurrent: false },
      { slug: "gweru", isCurrent: false },
    ]);
    expect(buildLocationList(["a", "b", "c"], 2)).toHaveLength(3);
  });
});

describe("mapWithConcurrency", () => {
  it("keeps order and never runs more than the limit at once", async () => {
    let inFlight = 0;
    let peak = 0;
    const out = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 1));
      inFlight -= 1;
      return n * 2;
    });
    expect(out).toEqual([2, 4, 6, 8, 10]);
    expect(peak).toBeLessThanOrEqual(2);
  });
});
