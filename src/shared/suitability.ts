/**
 * Suitability evaluation engine, ported from mukoko-weather
 * `src/lib/suitability.ts` with the same logic and the web's test vectors.
 *
 * Evaluates weather insight data against the rules the Worker serves at
 * `GET /v1/suitability` (`src/api/activities.ts`). Conditions are checked in
 * order and the first match wins.
 *
 * Two differences from the web, both at the edge:
 *  - the rule types live here (the web keeps them in its database module);
 *  - a missing rule is NOT shown as a "Fair" rating. The web's generic
 *    fallback says "No specific rules available", which reads as advice; here
 *    `evaluateSuitability` returns `null` and the screen says it has no rule.
 *
 * `colorClass` and `bgClass` are CSS class names (`text-severity-low`) the
 * Worker sends for the web. They are kept as sent; the app reads the severity
 * from the rating's `level` and `colorClass` (`src/theme/ratings.ts`).
 */

import type { Activity } from "./activities";
import type { WeatherInsights } from "./weather";

export type SuitabilityLevel = "excellent" | "good" | "fair" | "poor";

export interface SuitabilityCondition {
  /** Weather insight field to check (for example `thunderstormProbability`). */
  field: string;
  operator: "gt" | "gte" | "lt" | "lte" | "eq";
  value: number;
  level: SuitabilityLevel;
  label: string;
  /** The web's CSS class for the text colour (a severity token). */
  colorClass: string;
  /** The web's CSS class for the background (a severity token). */
  bgClass: string;
  detail: string;
  /** Optional metric template; `{value}` is the matched value. */
  metricTemplate?: string;
}

/**
 * A rule set for a category (`category:farming`) or one activity
 * (`activity:drone-flying`). Conditions are evaluated in order, first match
 * wins, and the fallback applies when none does.
 */
export interface SuitabilityRuleDoc {
  key: string;
  conditions: SuitabilityCondition[];
  fallback: Omit<SuitabilityCondition, "field" | "operator" | "value">;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SuitabilityRating {
  level: SuitabilityLevel;
  label: string;
  colorClass: string;
  bgClass: string;
  detail: string;
  metric?: string;
}

// ---------------------------------------------------------------------------
// Evaluation engine
// ---------------------------------------------------------------------------

/**
 * Compare a weather insight field against a threshold using the given operator.
 */
function compareValue(
  actual: number,
  operator: SuitabilityCondition["operator"],
  threshold: number,
): boolean {
  switch (operator) {
    case "gt":
      return actual > threshold;
    case "gte":
      return actual >= threshold;
    case "lt":
      return actual < threshold;
    case "lte":
      return actual <= threshold;
    // eq uses strict equality — safe for integer-valued alert levels (e.g., uvHealthConcern).
    // Not suitable for continuous float measurements due to JSON round-trip precision.
    case "eq":
      return actual === threshold;
    default:
      return false;
  }
}

/** Fields that display one decimal place instead of rounding to integer. */
const DECIMAL_FIELDS = new Set(["visibility", "evapotranspiration"]);

/**
 * Resolve a metric template by replacing {field} placeholders with actual values.
 * Supports {value} (the matched field's value) and {fieldName} for any insight field.
 */
function resolveMetric(
  template: string | undefined,
  insights: WeatherInsights,
  matchedField?: string,
  matchedValue?: number,
): string | undefined {
  if (!template) return undefined;
  let resolved = template;

  // Replace {value} with the matched condition's value
  if (matchedValue != null) {
    resolved = resolved.replace(
      "{value}",
      matchedValue.toFixed(DECIMAL_FIELDS.has(matchedField ?? "") ? 1 : 0),
    );
  }

  // Replace any {fieldName} placeholders with actual insight values
  const insightRecord = insights as Record<string, unknown>;
  resolved = resolved.replace(/\{(\w+)\}/g, (match, field) => {
    const val = insightRecord[field];
    if (val == null) return match;
    if (typeof val === "number") {
      return DECIMAL_FIELDS.has(field)
        ? val.toFixed(1)
        : Math.round(val).toString();
    }
    return String(val);
  });

  // If any unresolved placeholders remain, omit the metric
  if (resolved.includes("{")) return undefined;

  return resolved;
}

/**
 * Evaluate weather insights against a suitability rule set.
 * Conditions are checked in order — first match wins.
 */
export function evaluateRule(
  rule: SuitabilityRuleDoc,
  insights: WeatherInsights,
): SuitabilityRating {
  const insightRecord = insights as Record<string, unknown>;

  for (const condition of rule.conditions) {
    const fieldValue = insightRecord[condition.field];
    if (fieldValue == null || typeof fieldValue !== "number") continue;

    if (compareValue(fieldValue, condition.operator, condition.value)) {
      return {
        level: condition.level,
        label: condition.label,
        colorClass: condition.colorClass,
        bgClass: condition.bgClass,
        detail: condition.detail,
        metric: resolveMetric(
          condition.metricTemplate,
          insights,
          condition.field,
          fieldValue,
        ),
      };
    }
  }

  // No condition matched — use fallback
  return {
    level: rule.fallback.level,
    label: rule.fallback.label,
    colorClass: rule.fallback.colorClass,
    bgClass: rule.fallback.bgClass,
    detail: rule.fallback.detail,
    metric: resolveMetric(rule.fallback.metricTemplate, insights),
  };
}

// ---------------------------------------------------------------------------
// Activity-level suitability resolution (rule lookup + evaluation)
// ---------------------------------------------------------------------------

/**
 * Resolve the best suitability rule for an activity and evaluate it.
 * Lookup order: activity-specific rule, then category rule. `null` when the
 * Worker has no rule for either (the web shows a generic "Fair" instead).
 */
export function evaluateSuitability(
  activity: Pick<Activity, "id" | "category">,
  insights: WeatherInsights,
  dbRules: Map<string, SuitabilityRuleDoc>,
): SuitabilityRating | null {
  // 1. Try activity-specific rule
  const activityRule = dbRules.get(`activity:${activity.id}`);
  if (activityRule) return evaluateRule(activityRule, insights);

  // 2. Try category rule
  const categoryRule = dbRules.get(`category:${activity.category}`);
  if (categoryRule) return evaluateRule(categoryRule, insights);

  return null;
}
