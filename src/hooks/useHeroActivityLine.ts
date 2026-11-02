/**
 * The hero's "for your activities" line: the first picked activity whose next
 * 24 hours can be read, as one clause ("good until 15:00", "good for the next
 * 24 hours"). Same rule as the web's `CurrentConditions`: the rules the lane
 * and the advice cards use, `feasibilitySeries` for the hours, and
 * `heroActivityClause` for the words, all in the place's time.
 *
 * Rules are only asked for when something is picked. With none picked, or the
 * rules not loaded (or failed), there is no line: the hero never shows a
 * rating it could not make.
 */

import { useMemo } from "react";

import {
  useActivityCatalogue,
  useSuitabilityRules,
} from "@/hooks/useActivityData";
import { usePageColors } from "@/hooks/usePageColors";
import { feasibilitySeries } from "@/shared/activity-feasibility";
import { laneMineral } from "@/shared/activities";
import { heroActivityClause } from "@/shared/hero";
import { type WeatherData } from "@/shared/weather";
import { usePreferences } from "@/state/preferences";
import { mineralColor } from "@/theme/ratings";

import { type HeroActivityLine } from "@/components/weather/SkyHero";

export function useHeroActivityLine(
  forecast: WeatherData | undefined,
  now: Date,
): HeroActivityLine | null {
  const { colors, scheme } = usePageColors();
  const { activities: picked } = usePreferences();
  const { activities } = useActivityCatalogue(picked.length > 0);
  const { rules } = useSuitabilityRules(picked.length > 0);
  const offset = forecast?.utc_offset_seconds;

  return useMemo(() => {
    if (!forecast || !rules || picked.length === 0) return null;
    for (const id of picked) {
      const activity = activities.find((a) => a.id === id);
      if (!activity) continue;
      const clause = heroActivityClause(
        feasibilitySeries(activity, forecast.hourly, rules, 24, offset, now),
        offset,
      );
      if (clause) {
        return {
          label: activity.label,
          clause,
          dot: mineralColor(laneMineral(activity.category), colors, scheme),
        };
      }
    }
    return null;
  }, [forecast, rules, picked, activities, offset, now, colors, scheme]);
}
