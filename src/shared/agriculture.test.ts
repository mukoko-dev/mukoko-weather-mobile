/**
 * The web's own agriculture vectors (mukoko-weather `src/lib/agriculture.test.ts`),
 * run against the ported module, plus the mobile-only rules: the pinned farming
 * table, the crops a stored preference stands for, the request query, and the
 * words for every reason the Worker gives for "no farm data".
 */

import activitiesFarming from "@/api/__fixtures__/activities-farming.json";
import agricultureHarare from "@/api/__fixtures__/agriculture-harare.json";
import agricultureUnavailable from "@/api/__fixtures__/agriculture-unavailable.json";

import {
  FARMING_ACTIVITIES,
  FARMING_ACTIVITY_IDS,
  RISK_TONE,
  STAGE_LABELS,
  STATUS_LABELS,
  STATUS_TONE,
  WINDOW_ORDER,
  agricultureQuery,
  cropAdvice,
  cropLabel,
  cropsFromPreferences,
  dayLabel,
  farmingActivities,
  forecastChartRows,
  forecastDays,
  formatAnomaly,
  formatBalance,
  formatGdd,
  formatMm,
  formatMoisture,
  formatTempC,
  gddRows,
  hasSeries,
  hhmm,
  isAgricultureReady,
  locationMonth,
  stageForMonth,
  summarizeHistory,
  unavailableFor,
  type AgriDay,
  type AgricultureResponse,
} from "./agriculture";

describe("farming activities", () => {
  it("lists exactly the farming-category activities the Worker serves", () => {
    const served = activitiesFarming.activities.map((a) => ({
      id: a.id,
      label: a.label,
    }));
    const sort = <T extends { id: string }>(xs: readonly T[]) =>
      [...xs].sort((a, b) => a.id.localeCompare(b.id));
    expect(sort(FARMING_ACTIVITIES)).toEqual(sort(served));
    expect([...FARMING_ACTIVITY_IDS].sort()).toEqual(
      activitiesFarming.activities.map((a) => a.id).sort(),
    );
  });

  it("keeps farming ids in the user's order, de-duplicated", () => {
    expect(
      farmingActivities([
        "soccer",
        "tobacco-farming",
        "crop-farming",
        "tobacco-farming",
      ]),
    ).toEqual(["tobacco-farming", "crop-farming"]);
    expect(farmingActivities([])).toEqual([]);
  });
});

describe("agricultureQuery", () => {
  it("builds the public endpoint's query with location, country and crops", () => {
    expect(
      agricultureQuery(
        { slug: "harare", lat: -17.83, lon: 31.05, country: "ZW" },
        ["crop-farming", "tobacco-farming"],
      ),
    ).toEqual({
      lat: "-17.83",
      lon: "31.05",
      location: "harare",
      country: "ZW",
      crops: "crop-farming,tobacco-farming",
    });
  });

  it("omits empty country and crops", () => {
    expect(agricultureQuery({ slug: "x", lat: 1, lon: 2 })).toEqual({
      lat: "1",
      lon: "2",
      location: "x",
    });
  });
});

describe("status + risk tones", () => {
  it("maps statuses to severity tones (low safe, moderate mild, severe stop)", () => {
    expect(STATUS_TONE).toEqual({
      go: "low",
      wait: "moderate",
      avoid: "severe",
    });
    expect(RISK_TONE.high).toBe("severe");
    expect(RISK_TONE.none).toBe("low");
  });

  it("labels and window order", () => {
    expect(STATUS_LABELS.avoid).toBe("Hold off");
    expect(WINDOW_ORDER).toEqual(["spray", "plant", "harvest", "irrigate"]);
  });
});

describe("formatters", () => {
  it("formats rain, balance, moisture, temperature and GDD", () => {
    expect(formatMm(null)).toBe("—");
    expect(formatMm(0)).toBe("0 mm");
    expect(formatMm(2.34)).toBe("2.3 mm");
    expect(formatMm(18.6)).toBe("19 mm");
    expect(formatBalance(-18.4)).toBe("−18 mm");
    expect(formatBalance(6)).toBe("+6 mm");
    expect(formatBalance(0.2)).toBe("0 mm");
    expect(formatBalance(undefined)).toBe("—");
    expect(formatMoisture(0.274)).toBe("27%");
    expect(formatTempC(18.6)).toBe("19°C");
    expect(formatGdd(359.6)).toBe("360");
    expect(hhmm("2026-10-11T06:00")).toBe("06:00");
    expect(dayLabel("2026-10-13")).toBe("13 Oct");
    expect(dayLabel("bad")).toBe("bad");
  });
});

describe("readiness + forecast slicing", () => {
  it("needs available data with windows and rain", () => {
    expect(isAgricultureReady(null)).toBe(false);
    expect(
      isAgricultureReady({ available: false } as AgricultureResponse),
    ).toBe(false);
    expect(
      isAgricultureReady({
        available: true,
        windows: {},
        rain: {},
        headline: "Good day to spray.",
        verdict: "go",
      } as unknown as AgricultureResponse),
    ).toBe(true);
    // A missing verdict or headline is never papered over with a made-up one.
    expect(
      isAgricultureReady({
        available: true,
        windows: {},
        rain: {},
        headline: null,
        verdict: "go",
      } as unknown as AgricultureResponse),
    ).toBe(false);
  });

  it("keeps forecast days only", () => {
    const days = [
      { date: "2026-10-10", forecast: false },
      { date: "2026-10-11", forecast: true },
    ] as AgriDay[];
    expect(forecastDays(days).map((d) => d.date)).toEqual(["2026-10-11"]);
  });
});

describe("mirrors the Worker's answer", () => {
  const recorded = agricultureHarare as unknown as AgricultureResponse;

  it("reads a recorded Harare answer as ready, with every group the card shows", () => {
    expect(isAgricultureReady(recorded)).toBe(true);
    expect(recorded.verdict).toBe("go");
    expect(WINDOW_ORDER.every((k) => recorded.windows?.[k])).toBe(true);
    expect(recorded.daily).toHaveLength(46);
    expect(Object.keys(recorded.daily[0])).toEqual(
      expect.arrayContaining([
        "soilMoisture27to81",
        "soilTemp54",
        "leafWetHours",
        "sprayHours",
        "gddCumulative",
      ]),
    );
  });

  it("splits the recorded 46 days into past 30 and forecast 16", () => {
    expect(forecastDays(recorded.daily)).toHaveLength(16);
    expect(recorded.daily.filter((d) => !d.forecast)).toHaveLength(30);
  });

  it("builds sixteen chart rows and a GDD series from it", () => {
    const rows = forecastChartRows(recorded.daily);
    expect(rows).toHaveLength(16);
    expect(hasSeries(rows, ["rainMm", "et0Mm"])).toBe(true);
    expect(gddRows(recorded.daily)).toHaveLength(46);
  });

  it("reads the calendar of a place with one and none for a place without", () => {
    const [maize] = recorded.calendar;
    expect(maize.label).toBe("Maize");
    expect(stageForMonth(maize, 11)).toBe("plant");
    expect(stageForMonth(maize, 4)).toBe("harvest");
  });
});

function day(over: Partial<AgriDay>): AgriDay {
  return {
    date: "2026-10-11",
    forecast: true,
    rainMm: 0,
    rainProbability: 0,
    et0Mm: 5,
    balanceMm: -5,
    tMax: 28,
    tMin: 12,
    windMaxKmh: 10,
    gdd: 10,
    gddCumulative: 10,
    soilMoisture0to1: 0.27,
    soilMoisture1to3: 0.27,
    soilMoisture3to9: 0.27,
    soilMoisture9to27: 0.3,
    soilMoisture27to81: 0.35,
    soilTemp0: 30,
    soilTemp6: 22,
    soilTemp18: 21,
    soilTemp54: 20,
    vpdMaxKpa: 2,
    leafWetHours: 6,
    sprayHours: 5,
    ...over,
  };
}

describe("chart rows", () => {
  it("builds forecast rows with a running water balance and soil as %", () => {
    const rows = forecastChartRows([
      day({ date: "2026-10-10", forecast: false }),
      day({ date: "2026-10-11", balanceMm: -5 }),
      day({ date: "2026-10-12", balanceMm: 3, soilMoisture0to1: null }),
    ]);
    expect(rows.map((r) => r.date)).toEqual(["11 Oct", "12 Oct"]);
    expect(rows[1].cumulativeBalanceMm).toBe(-2);
    expect(rows[0].sm0to1).toBe(27);
    expect(rows[1].sm0to1).toBeNull();
    expect(hasSeries(rows, ["sm0to1"])).toBe(true);
    expect(hasSeries(rows, ["nope"])).toBe(false);
  });

  it("GDD rows span past and forecast days", () => {
    const rows = gddRows([
      day({ date: "2026-09-12", forecast: false, gddCumulative: 12 }),
      day({ date: "2026-10-11", gddCumulative: 300 }),
    ]);
    expect(rows).toEqual([
      { date: "12 Sep", gddMaize: 12 },
      { date: "11 Oct", gddMaize: 300 },
    ]);
  });
});

describe("calendar", () => {
  const maize = {
    id: "crop-farming",
    label: "Maize",
    phase: null,
    months: { plant: [11, 12], harvest: [4, 5] },
  };
  it("finds the stage for a month", () => {
    expect(stageForMonth(maize, 11)).toBe("plant");
    expect(stageForMonth(maize, 5)).toBe("harvest");
    expect(stageForMonth(maize, 8)).toBeNull();
  });
  it("names every stage", () => {
    expect(STAGE_LABELS).toEqual({
      nursery: "Nursery",
      plant: "Plant",
      grow: "Grow",
      harvest: "Harvest",
    });
  });
  it("reads the month in the location's time zone", () => {
    // 2026-10-31 23:30 UTC is already November in Harare (UTC+2)…
    const t = Date.UTC(2026, 9, 31, 23, 30);
    expect(locationMonth(7200, t)).toBe(11);
    // …but still October in Mexico City (UTC−6).
    expect(locationMonth(-21600, t)).toBe(10);
    expect(locationMonth(null, t)).toBe(10);
  });
});

describe("crop advice", () => {
  const data = {
    available: true,
    windows: {
      spray: { status: "go", label: "Spray today 06:00–10:00", detail: "" },
      plant: {
        status: "wait",
        label: "Wait for planting rains",
        detail: "Topsoil is dry.",
      },
      harvest: {
        status: "go",
        label: "3 dry days ahead",
        detail: "Good for drying.",
      },
      irrigate: {
        status: "go",
        label: "Irrigate: 18 mm deficit",
        detail: "Water early.",
      },
    },
    risks: {
      frost: { level: "none", days: [], extremeC: 10, detail: "No frost." },
      heat: {
        level: "high",
        days: [],
        extremeC: 36,
        detail: "Crop heat stress tomorrow.",
      },
    },
    waterBalance: { balanceNext7dMm: -30 },
    gdd: { next7d: 84 },
    rain: { rainyDaysNext7: 0 },
    daily: [day({ leafWetHours: 8 }), day({ leafWetHours: 8 })],
  } as unknown as AgricultureResponse;

  it("gives each selected crop tips tied to the windows", () => {
    const advice = cropAdvice(
      ["crop-farming", "tobacco-farming", "livestock"],
      data,
    );
    expect(advice.map((a) => a.id)).toEqual([
      "crop-farming",
      "tobacco-farming",
      "livestock",
    ]);
    expect(advice[0].label).toBe("Maize & Crop Farming");
    expect(advice[0].tips[0]).toContain("Wait for planting rains");
    expect(
      advice[0].tips.some((t) => t.includes("84 growing degree days")),
    ).toBe(true);
    expect(
      advice[0].tips.some((t) => t.includes("Heat stress this week")),
    ).toBe(true);
    expect(advice[0].tips.some((t) => t.includes("tasselling"))).toBe(false);
    expect(advice[1].tips[0]).toContain("16 leaf-wet hours");
    expect(advice[2].tips).toContain(
      "Dry week ahead: check water points and grazing reserves.",
    );
    for (const a of advice) expect(a.tips.length).toBeLessThanOrEqual(3);
  });

  it("livestock tips follow the rain data, never a default wet-weather line", () => {
    const base = {
      ...data,
      waterBalance: { balanceNext7dMm: -5 },
      rain: { rainyDaysNext7: 0 },
    } as unknown as AgricultureResponse;
    expect(cropAdvice(["livestock"], base)[0].tips.join(" ")).not.toContain(
      "tick",
    );
    const wet = {
      ...base,
      rain: { rainyDaysNext7: 5 },
    } as unknown as AgricultureResponse;
    expect(cropAdvice(["livestock"], wet)[0].tips.join(" ")).toContain(
      "tick pressure",
    );
    const nullBalance = {
      ...base,
      waterBalance: null,
      rain: { rainyDaysNext7: 0 },
    } as unknown as AgricultureResponse;
    expect(
      cropAdvice(["livestock"], nullBalance)[0].tips.join(" "),
    ).not.toContain("tick");
  });

  it("drops crops with nothing to say and handles missing windows", () => {
    expect(
      cropAdvice(["forestry"], {
        ...data,
        waterBalance: { balanceNext7dMm: 5 },
      } as AgricultureResponse),
    ).toEqual([]);
    expect(cropAdvice(["crop-farming"], { ...data, windows: null })).toEqual(
      [],
    );
  });
});

describe("history against normals", () => {
  it("summarises recorded days", () => {
    const s = summarizeHistory([
      {
        daily: {
          temperature_2m_max: [30],
          temperature_2m_min: [14],
          precipitation_sum: [2],
        },
      },
      {
        daily: {
          temperature_2m_max: [28],
          temperature_2m_min: [null],
          precipitation_sum: [3.5],
        },
      },
      {},
    ]);
    expect(s).toEqual({ days: 3, rainMm: 5.5, meanHigh: 29, meanLow: 14 });
    expect(summarizeHistory([])).toEqual({
      days: 0,
      rainMm: null,
      meanHigh: null,
      meanLow: null,
    });
  });

  it("formats anomalies with a true minus sign", () => {
    expect(formatAnomaly(29.4, 28)).toBe("+1.4°C");
    expect(formatAnomaly(27.4, 28)).toBe("−0.6°C");
    expect(formatAnomaly(28, 28)).toBe("0.0°C");
    expect(formatAnomaly(null, 28)).toBeNull();
  });
});

describe("crops from the stored preference", () => {
  it("passes real farming activity ids through, in order", () => {
    expect(
      cropsFromPreferences(["soccer", "tobacco-farming", "crop-farming"]),
    ).toEqual(["tobacco-farming", "crop-farming"]);
  });

  it("lets the Farming category stand for the general crop activity", () => {
    expect(cropsFromPreferences(["farming"])).toEqual(["crop-farming"]);
    expect(cropsFromPreferences(["farming", "crop-farming"])).toEqual([
      "crop-farming",
    ]);
    expect(cropsFromPreferences(["farming", "livestock"])).toEqual([
      "crop-farming",
      "livestock",
    ]);
  });

  it("is empty when nothing farming is chosen", () => {
    expect(cropsFromPreferences([])).toEqual([]);
    expect(cropsFromPreferences(["mining", "travel"])).toEqual([]);
  });

  it("labels a crop from the farming table and falls back to its id", () => {
    expect(cropLabel("crop-farming")).toBe("Maize & Crop Farming");
    expect(cropLabel("unknown-crop")).toBe("unknown-crop");
  });
});

describe("why there is no farm data", () => {
  it("has its own words for each reason the Worker gives", () => {
    const titles = new Set(
      [
        "provider_unavailable",
        "provider_error",
        "insufficient_data",
        "analysis_error",
      ].map((r) => unavailableFor(r).title),
    );
    expect(titles.size).toBe(4);
  });

  it("says whether trying again helps", () => {
    expect(unavailableFor("provider_unavailable").retry).toBe(true);
    expect(unavailableFor("insufficient_data").retry).toBe(true);
    expect(unavailableFor("analysis_error").retry).toBe(false);
  });

  it("gives an unknown or missing reason the general line, not a made-up cause", () => {
    const general = unavailableFor(undefined);
    expect(unavailableFor(null)).toEqual(general);
    expect(unavailableFor("something_new")).toEqual(general);
    expect(general.title).toBe("Farm data is not available");
  });

  it("reads the recorded unavailable answer as not ready", () => {
    const off = agricultureUnavailable as unknown as AgricultureResponse;
    expect(isAgricultureReady(off)).toBe(false);
    expect(unavailableFor(off.reason).title).toBe("No farm data for this point");
  });
});
