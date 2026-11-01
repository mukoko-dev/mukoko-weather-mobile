/**
 * The activity data the screens share: the activity list and categories (the
 * web's seed first, the Worker's answer when it arrives) and the suitability
 * rules (Worker only, with a failure state and a way to try again).
 *
 * The API layer caches for ten minutes and shares requests in flight, so the
 * Community lane, the hero line and the advice sheet mounting together cost
 * one request each, not one per component.
 */

import { useCallback, useEffect, useState } from "react";

import {
  loadActivities,
  loadCategories,
  loadSuitabilityRules,
  rulesByKey,
} from "@/api/activities";
import {
  ACTIVITIES,
  ACTIVITY_CATEGORIES,
  type Activity,
  type ActivityCategoryInfo,
} from "@/shared/activities";
import { type SuitabilityRuleDoc } from "@/shared/suitability";

/**
 * Where the activity list came from: `loading` (the seed is showing while the
 * Worker answers), `live` (the Worker's list) or `builtin` (the Worker could
 * not be reached, so the same list the app ships is showing and the picker
 * says so).
 */
export type CatalogueSource = "loading" | "live" | "builtin";

/** The activity list and categories. The seed shows at once, never empty. */
export function useActivityCatalogue(enabled: boolean = true): {
  activities: Activity[];
  categories: ActivityCategoryInfo[];
  source: CatalogueSource;
} {
  const [activities, setActivities] = useState<Activity[]>(ACTIVITIES);
  const [categories, setCategories] =
    useState<ActivityCategoryInfo[]>(ACTIVITY_CATEGORIES);
  const [source, setSource] = useState<CatalogueSource>("loading");

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let alive = true;
    void loadActivities(controller.signal).then((list) => {
      if (!alive) return;
      setActivities(list);
      setSource(list === ACTIVITIES ? "builtin" : "live");
    });
    void loadCategories(controller.signal).then((list) => {
      if (alive) setCategories(list);
    });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [enabled]);

  return { activities, categories, source };
}

export type RulesStatus = "idle" | "loading" | "ready" | "failed";

export type RulesState = {
  status: RulesStatus;
  rules: Map<string, SuitabilityRuleDoc> | null;
  retry: () => void;
};

/**
 * The suitability rules, loaded only while `enabled` (a person who has picked
 * no activity never asks for them). `failed` means the Worker's rules could
 * not be read: the screens say so and offer `retry`; they never show a rating
 * made without them.
 */
export function useSuitabilityRules(enabled: boolean): RulesState {
  const [status, setStatus] = useState<RulesStatus>("idle");
  const [rules, setRules] = useState<Map<string, SuitabilityRuleDoc> | null>(
    null,
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let alive = true;
    setStatus("loading");
    loadSuitabilityRules(controller.signal)
      .then((list) => {
        if (!alive) return;
        setRules(rulesByKey(list));
        setStatus("ready");
      })
      .catch(() => {
        if (!alive) return;
        setStatus("failed");
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [enabled, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { status: enabled ? status : "idle", rules, retry };
}
