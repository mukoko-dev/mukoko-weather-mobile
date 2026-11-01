/**
 * Activities and their suitability rules, from the weather Worker:
 *
 *   GET /v1/activities                  -> { activities: [...], total }
 *   GET /v1/activities?mode=categories  -> { categories: [{ id, label, order, style }] }
 *   GET /v1/suitability                 -> { rules: [{ key, conditions, fallback }] }
 *
 * The same data the web reads (its `activities-client` and
 * `suitability-cache`). Each answer is checked field by field, so one bad row
 * is dropped and never breaks the picker or a rating. Every answer is kept in
 * memory for ten minutes and a request already in flight is shared, so the
 * lane, the hero line and the advice sheet mounting together ask once.
 *
 * Nothing about a person is sent: these are plain reads. The activities a
 * person picks stay on the device (`src/state/preferences.ts`).
 */

import { apiFetch, ROUTES } from "@/api/client";
import {
  ACTIVITIES,
  ACTIVITY_CATEGORIES,
  type Activity,
  type ActivityCategoryInfo,
} from "@/shared/activities";
import {
  type SuitabilityCondition,
  type SuitabilityLevel,
  type SuitabilityRuleDoc,
} from "@/shared/suitability";

/** Both lists change only when the Worker is redeployed (same as the web). */
export const ACTIVITY_CACHE_TTL_MS = 10 * 60 * 1000;

const LEVELS: readonly SuitabilityLevel[] = [
  "excellent",
  "good",
  "fair",
  "poor",
];
const OPERATORS = ["gt", "gte", "lt", "lte", "eq"] as const;
const ID = /^[a-z0-9-]{1,40}$/;

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

/** One activity from the wire, or `null` when it is not usable. */
export function toActivity(raw: unknown): Activity | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id);
  const label = str(r.label);
  const category = str(r.category);
  if (!id || !ID.test(id) || !label || !category) return null;
  const tags = Array.isArray(r.relevantTags)
    ? r.relevantTags.filter((t): t is string => typeof t === "string")
    : [];
  return {
    id,
    label,
    category: category as Activity["category"],
    relevantTags: tags as Activity["relevantTags"],
    description: typeof r.description === "string" ? r.description : "",
    icon: str(r.icon),
  };
}

export function toActivities(body: unknown): Activity[] {
  const list = (body as { activities?: unknown } | null | undefined)
    ?.activities;
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: Activity[] = [];
  for (const raw of list) {
    const a = toActivity(raw);
    if (!a || seen.has(a.id)) continue;
    seen.add(a.id);
    out.push(a);
  }
  return out;
}

export function toCategories(body: unknown): ActivityCategoryInfo[] {
  const list = (body as { categories?: unknown } | null | undefined)
    ?.categories;
  if (!Array.isArray(list)) return [];
  const rows: { info: ActivityCategoryInfo; order: number }[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const id = str(r.id);
    const label = str(r.label);
    if (!id || !ID.test(id) || !label) continue;
    rows.push({
      info: { id: id as ActivityCategoryInfo["id"], label },
      order: typeof r.order === "number" ? r.order : rows.length + 1,
    });
  }
  return rows.sort((a, b) => a.order - b.order).map((r) => r.info);
}

function toCondition(raw: unknown): SuitabilityCondition | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const field = str(r.field);
  const label = str(r.label);
  if (!field || !label) return null;
  if (!(OPERATORS as readonly unknown[]).includes(r.operator)) return null;
  if (!LEVELS.includes(r.level as SuitabilityLevel)) return null;
  if (typeof r.value !== "number" || !Number.isFinite(r.value)) return null;
  return {
    field,
    operator: r.operator as SuitabilityCondition["operator"],
    value: r.value,
    level: r.level as SuitabilityLevel,
    label,
    colorClass: typeof r.colorClass === "string" ? r.colorClass : "",
    bgClass: typeof r.bgClass === "string" ? r.bgClass : "",
    detail: typeof r.detail === "string" ? r.detail : "",
    metricTemplate: str(r.metricTemplate),
  };
}

/** One rule, or `null` when it has no key or no usable fallback. */
export function toRule(raw: unknown): SuitabilityRuleDoc | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const key = str(r.key);
  if (!key || !/^(activity|category):[a-z0-9-]+$/.test(key)) return null;
  const fb = r.fallback as Record<string, unknown> | undefined;
  if (!fb || typeof fb !== "object") return null;
  const label = str(fb.label);
  if (!label || !LEVELS.includes(fb.level as SuitabilityLevel)) return null;
  const conditions = Array.isArray(r.conditions)
    ? r.conditions
        .map(toCondition)
        .filter((c): c is SuitabilityCondition => c !== null)
    : [];
  return {
    key,
    conditions,
    fallback: {
      level: fb.level as SuitabilityLevel,
      label,
      colorClass: typeof fb.colorClass === "string" ? fb.colorClass : "",
      bgClass: typeof fb.bgClass === "string" ? fb.bgClass : "",
      detail: typeof fb.detail === "string" ? fb.detail : "",
      metricTemplate: str(fb.metricTemplate),
    },
  };
}

export function toRules(body: unknown): SuitabilityRuleDoc[] {
  const list = (body as { rules?: unknown } | null | undefined)?.rules;
  if (!Array.isArray(list)) return [];
  return list.map(toRule).filter((r): r is SuitabilityRuleDoc => r !== null);
}

// ---------------------------------------------------------------------------
// Cached loads
// ---------------------------------------------------------------------------

type Entry<T> = { value: T; at: number };

let activitiesEntry: Entry<Activity[]> | null = null;
let categoriesEntry: Entry<ActivityCategoryInfo[]> | null = null;
let rulesEntry: Entry<SuitabilityRuleDoc[]> | null = null;
let activitiesFlight: Promise<Activity[]> | null = null;
let categoriesFlight: Promise<ActivityCategoryInfo[]> | null = null;
let rulesFlight: Promise<SuitabilityRuleDoc[]> | null = null;

function fresh<T>(e: Entry<T> | null, now: number): e is Entry<T> {
  return e !== null && now - e.at < ACTIVITY_CACHE_TTL_MS;
}

/**
 * The activities. A failed or empty answer is not an error for the picker: the
 * seed (the same 55 activities the web ships) is returned, as the web does,
 * and the failure is not cached, so the next ask tries again.
 */
export async function loadActivities(
  signal?: AbortSignal,
  now: number = Date.now(),
): Promise<Activity[]> {
  if (fresh(activitiesEntry, now)) return activitiesEntry.value;
  if (activitiesFlight) return activitiesFlight;
  activitiesFlight = (async () => {
    try {
      const body = await apiFetch<unknown>(ROUTES.activities, { signal });
      const list = toActivities(body);
      if (list.length === 0) return ACTIVITIES;
      activitiesEntry = { value: list, at: now };
      return list;
    } catch {
      return ACTIVITIES;
    }
  })().finally(() => {
    activitiesFlight = null;
  });
  return activitiesFlight;
}

/** The categories, with the same fall back to the web's six. */
export async function loadCategories(
  signal?: AbortSignal,
  now: number = Date.now(),
): Promise<ActivityCategoryInfo[]> {
  if (fresh(categoriesEntry, now)) return categoriesEntry.value;
  if (categoriesFlight) return categoriesFlight;
  categoriesFlight = (async () => {
    try {
      const body = await apiFetch<unknown>(ROUTES.activities, {
        query: { mode: "categories" },
        signal,
      });
      const list = toCategories(body);
      if (list.length === 0) return ACTIVITY_CATEGORIES;
      categoriesEntry = { value: list, at: now };
      return list;
    } catch {
      return ACTIVITY_CATEGORIES;
    }
  })().finally(() => {
    categoriesFlight = null;
  });
  return categoriesFlight;
}

/**
 * The suitability rules. Unlike the lists above there is no seed: a rating
 * made without the Worker's rules would be invented, so a failure throws and
 * the screen shows its failure state with a way to try again. An answer with no
 * usable rule throws too.
 */
export async function loadSuitabilityRules(
  signal?: AbortSignal,
  now: number = Date.now(),
): Promise<SuitabilityRuleDoc[]> {
  if (fresh(rulesEntry, now)) return rulesEntry.value;
  if (rulesFlight) return rulesFlight;
  rulesFlight = (async () => {
    const body = await apiFetch<unknown>(ROUTES.suitability, { signal });
    const rules = toRules(body);
    if (rules.length === 0) {
      throw new Error("The activity rules were empty.");
    }
    rulesEntry = { value: rules, at: now };
    return rules;
  })().finally(() => {
    rulesFlight = null;
  });
  return rulesFlight;
}

/** The rules keyed by `category:farming` or `activity:drone-flying`. */
export function rulesByKey(
  rules: SuitabilityRuleDoc[],
): Map<string, SuitabilityRuleDoc> {
  return new Map(rules.map((r) => [r.key, r]));
}

/** Test helper: forget every cached answer. */
export function resetActivityCaches(): void {
  activitiesEntry = null;
  categoriesEntry = null;
  rulesEntry = null;
  activitiesFlight = null;
  categoriesFlight = null;
  rulesFlight = null;
}
