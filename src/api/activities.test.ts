/**
 * The activities, categories and suitability rules, read from answers recorded
 * from the live Worker (2026-11-01): the app's reading of each field, the
 * seed fall back for the lists, the honest failure for the rules, and the
 * ten-minute cache with a shared in-flight request.
 */

import activitiesFixture from "@/api/__fixtures__/activities.json";
import categoriesFixture from "@/api/__fixtures__/activity-categories.json";
import suitabilityFixture from "@/api/__fixtures__/suitability.json";
import {
  ACTIVITY_CACHE_TTL_MS,
  loadActivities,
  loadCategories,
  loadSuitabilityRules,
  resetActivityCaches,
  rulesByKey,
  toActivities,
  toCategories,
  toRule,
  toRules,
} from "@/api/activities";
import { mockFetch } from "@/api/mock-fetch";
import { ACTIVITIES, ACTIVITY_CATEGORIES } from "@/shared/activities";
import { evaluateSuitability } from "@/shared/suitability";

const BASE = "https://weather-api.mukoko.com";

beforeEach(() => resetActivityCaches());

describe("reading the Worker's activities", () => {
  it("reads all 55 recorded activities and matches the web's seed ids", () => {
    const list = toActivities(activitiesFixture);
    expect(list).toHaveLength(55);
    expect(list.map((a) => a.id).sort()).toEqual(
      ACTIVITIES.map((a) => a.id).sort(),
    );
  });

  it("keeps id, label, category, description, icon and tags", () => {
    const braai = toActivities(activitiesFixture).find(
      (a) => a.id === "barbecue",
    );
    expect(braai).toEqual({
      id: "barbecue",
      label: "Braai",
      category: "casual",
      description:
        "Braai, shisanyama, and outdoor grilling with friends and family",
      icon: "grill",
      relevantTags: [],
    });
  });

  it("drops a row with a bad id, no label or no category, and a duplicate", () => {
    const good = {
      id: "golf",
      label: "Golf",
      category: "sports",
      description: "",
      relevantTags: ["city"],
    };
    const list = toActivities({
      activities: [
        good,
        good,
        { ...good, id: "Not An Id" },
        { ...good, id: "x", label: "" },
        { ...good, id: "y", category: undefined },
        null,
        "z",
      ],
    });
    expect(list.map((a) => a.id)).toEqual(["golf"]);
  });

  it("reads the categories in the Worker's order, labels only", () => {
    const list = toCategories(categoriesFixture);
    expect(list.map((c) => c.id)).toEqual([
      "farming",
      "mining",
      "travel",
      "tourism",
      "sports",
      "casual",
    ]);
    expect(list.map((c) => c.label)).toEqual(
      ACTIVITY_CATEGORIES.map((c) => c.label),
    );
  });
});

describe("reading the Worker's suitability rules", () => {
  it("reads all ten recorded rules, in the keys the lookup uses", () => {
    const rules = toRules(suitabilityFixture);
    expect(rules.map((r) => r.key).sort()).toEqual(
      [
        "activity:conservation",
        "activity:drone-flying",
        "activity:shipping",
        "activity:stargazing",
        "category:casual",
        "category:farming",
        "category:mining",
        "category:sports",
        "category:tourism",
        "category:travel",
      ].sort(),
    );
    for (const r of rules) {
      expect(r.conditions.length).toBeGreaterThan(0);
      expect(r.fallback.label.length).toBeGreaterThan(0);
    }
  });

  it("rates a recorded activity from the recorded farming rule", () => {
    const rules = rulesByKey(toRules(suitabilityFixture));
    const crop = ACTIVITIES.find((a) => a.id === "crop-farming")!;
    // Severe precipitation is the first farming condition.
    const wet = evaluateSuitability(crop, { precipitationType: 2 }, rules);
    expect(wet?.level).toBe("poor");
    // Nothing matches a calm day: the rule's own fallback applies.
    const calm = evaluateSuitability(crop, { dewPoint: 12 }, rules);
    expect(calm?.level).toBe("good");
    expect(calm?.label).toBe("Good");
  });

  it("an activity override beats its category's rule (drone flying)", () => {
    const rules = rulesByKey(toRules(suitabilityFixture));
    const drone = ACTIVITIES.find((a) => a.id === "drone-flying")!;
    expect(rules.has("activity:drone-flying")).toBe(true);
    const storm = evaluateSuitability(
      drone,
      { thunderstormProbability: 80 },
      rules,
    );
    expect(storm?.level).toBe("poor");
  });

  it("drops a rule with a bad key or no usable fallback, and a bad condition", () => {
    const fb = { level: "good", label: "Good", detail: "ok" };
    const cond = {
      field: "windSpeed",
      operator: "gt",
      value: 30,
      level: "poor",
      label: "Windy",
      detail: "too windy",
    };
    expect(toRule({ key: "farming", conditions: [], fallback: fb })).toBeNull();
    expect(
      toRule({
        key: "category:farming",
        conditions: [],
        fallback: { label: "x" },
      }),
    ).toBeNull();
    const rule = toRule({
      key: "category:farming",
      conditions: [
        cond,
        { ...cond, operator: "near" },
        { ...cond, value: "30" },
        { ...cond, level: "great" },
        { ...cond, field: "" },
      ],
      fallback: fb,
    });
    expect(rule?.conditions).toHaveLength(1);
  });
});

describe("loadActivities / loadCategories", () => {
  it("asks the Worker once and caches for ten minutes", async () => {
    const calls = mockFetch({ body: activitiesFixture });
    const t0 = 1_000_000;
    const first = await loadActivities(undefined, t0);
    expect(first).toHaveLength(55);
    expect(calls[0].url).toBe(`${BASE}/v1/activities`);
    // Within the TTL no second request is made (mockFetch would throw).
    expect(
      await loadActivities(undefined, t0 + ACTIVITY_CACHE_TTL_MS - 1),
    ).toBe(first);
    expect(calls).toHaveLength(1);
  });

  it("asks again once the cache is ten minutes old", async () => {
    const calls = mockFetch(
      { body: activitiesFixture },
      { body: activitiesFixture },
    );
    const t0 = 5_000_000;
    await loadActivities(undefined, t0);
    await loadActivities(undefined, t0 + ACTIVITY_CACHE_TTL_MS + 1);
    expect(calls).toHaveLength(2);
  });

  it("shares a request in flight", async () => {
    const calls = mockFetch({ body: activitiesFixture });
    const [a, b] = await Promise.all([loadActivities(), loadActivities()]);
    expect(a).toBe(b);
    expect(calls).toHaveLength(1);
  });

  it("falls back to the web's seed when the Worker fails, and does not cache the failure", async () => {
    mockFetch({ status: 503, body: { error: "unavailable" } });
    expect(await loadActivities()).toBe(ACTIVITIES);
    const calls = mockFetch({ body: activitiesFixture });
    expect(await loadActivities()).toHaveLength(55);
    expect(calls).toHaveLength(1);
  });

  it("falls back to the seed when the answer holds no activity", async () => {
    mockFetch({ body: { activities: [] } });
    expect(await loadActivities()).toBe(ACTIVITIES);
  });

  it("reads categories with mode=categories, falling back to the six", async () => {
    const calls = mockFetch({ body: categoriesFixture });
    const list = await loadCategories();
    expect(list).toHaveLength(6);
    expect(calls[0].url).toBe(`${BASE}/v1/activities?mode=categories`);
    resetActivityCaches();
    mockFetch({ networkError: new Error("offline") });
    expect(await loadCategories()).toBe(ACTIVITY_CATEGORIES);
  });
});

describe("loadSuitabilityRules", () => {
  it("reads and caches the rules", async () => {
    const calls = mockFetch({ body: suitabilityFixture });
    const rules = await loadSuitabilityRules();
    expect(rules).toHaveLength(10);
    expect(calls[0].url).toBe(`${BASE}/v1/suitability`);
    await loadSuitabilityRules();
    expect(calls).toHaveLength(1);
  });

  it("throws on a failed request (no invented rating) and tries again next time", async () => {
    mockFetch({ status: 500, body: { error: "internal" } });
    await expect(loadSuitabilityRules()).rejects.toMatchObject({ status: 500 });
    const calls = mockFetch({ body: suitabilityFixture });
    await expect(loadSuitabilityRules()).resolves.toHaveLength(10);
    expect(calls).toHaveLength(1);
  });

  it("throws when the answer holds no usable rule", async () => {
    mockFetch({ body: { rules: [{ key: "bad" }] } });
    await expect(loadSuitabilityRules()).rejects.toThrow("empty");
  });
});
