/**
 * The advice card for one activity (the web's `ActivityCard`): its rating now
 * with the rule's sentence, a 24-hour feasibility trend, and up to three
 * deterministic, weather-driven tips. No AI call: the rating is the Worker's
 * suitability rule evaluated on the device, the trend is the same rule on
 * each forecast hour, and the tips are fixed wording chosen by the forecast.
 *
 * The rating is a severity-coloured word on a faint tint of the same colour
 * (the weather scale for a value, not a brand mineral), and the word is always
 * there, so colour is never the only signal. The card's whole border takes the
 * category mineral. With no rule for the activity the card says so rather than
 * showing a made-up rating.
 */

import { useMemo } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";

import { ActivityIcon } from "@/components/icons/ActivityIcon";
import { SIZE, SPACE, BORDER, RADIUS, withAlpha } from "@/theme/mzizi";
import { usePageColors } from "@/hooks/usePageColors";
import { type Activity, categoryMineral } from "@/shared/activities";
import { feasibilitySeries } from "@/shared/activity-feasibility";
import { getActivityTips } from "@/shared/activity-tips";
import {
  type SuitabilityRuleDoc,
  evaluateSuitability,
} from "@/shared/suitability";
import { type WeatherData, type WeatherInsights } from "@/shared/weather";
import {
  LANE,
  SEVERITY_TINT,
  mineralColor,
  severityColor,
  severityOfRating,
} from "@/theme/ratings";

import { FeasibilityChart } from "./FeasibilityChart";
import { WxText } from "./WxText";

export type ActivityCardProps = {
  activity: Activity;
  insights: WeatherInsights;
  rules: Map<string, SuitabilityRuleDoc>;
  forecast: WeatherData;
  now: Date;
  /** Called with the card's top, so the sheet can scroll to it. */
  onLayoutTop?: (y: number) => void;
};

export function ActivityCard({
  activity,
  insights,
  rules,
  forecast,
  now,
  onLayoutTop,
}: ActivityCardProps) {
  const { colors, scheme } = usePageColors();
  const mineral = mineralColor(
    categoryMineral(activity.category),
    colors,
    scheme,
  );
  const rating = evaluateSuitability(activity, insights, rules);
  const trend = useMemo(
    () =>
      feasibilitySeries(
        activity,
        forecast.hourly,
        rules,
        24,
        forecast.utc_offset_seconds,
        now,
      ),
    [activity, forecast, rules, now],
  );
  const tips = useMemo(
    () => getActivityTips(activity, forecast),
    [activity, forecast],
  );

  const tone = rating
    ? severityColor(severityOfRating(rating.level, rating.colorClass), scheme)
    : colors.textTertiary;

  return (
    <View
      testID={`activity-card-${activity.id}`}
      onLayout={
        onLayoutTop
          ? (e: LayoutChangeEvent) => onLayoutTop(e.nativeEvent.layout.y)
          : undefined
      }
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: mineral },
      ]}
    >
      <View style={styles.head}>
        <View
          style={[
            styles.disc,
            { backgroundColor: withAlpha(mineral, SEVERITY_TINT) },
          ]}
        >
          <ActivityIcon
            icon={activity.icon}
            size={SIZE.iconMd}
            color={mineral}
          />
        </View>
        <View style={styles.titles}>
          <View style={styles.titleRow}>
            <WxText
              type="body"
              weight={600}
              color={colors.textPrimary}
              accessibilityRole="header"
            >
              {activity.label}
            </WxText>
            {rating ? (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: withAlpha(tone, SEVERITY_TINT) },
                ]}
              >
                <WxText type="body" weight={700} color={tone}>
                  {rating.label}
                </WxText>
              </View>
            ) : null}
            {rating?.metric ? (
              <WxText type="body" tabular color={colors.textTertiary}>
                {rating.metric}
              </WxText>
            ) : null}
          </View>
          <WxText type="body" color={colors.textSecondary}>
            {rating
              ? rating.detail
              : "There is no rule for this activity yet, so no rating is shown."}
          </WxText>
        </View>
      </View>

      {trend.length >= 2 ? (
        <View style={styles.trend}>
          <WxText type="bodySm" color={colors.textTertiary}>
            Next 24 hours
          </WxText>
          <FeasibilityChart
            points={trend}
            color={mineral}
            label={activity.label}
            utcOffsetSeconds={forecast.utc_offset_seconds}
          />
        </View>
      ) : null}

      {tips.length > 0 ? (
        <View style={styles.tips}>
          {tips.map((tip) => (
            <View key={tip} style={styles.tip}>
              <View
                importantForAccessibility="no-hide-descendants"
                style={[
                  styles.bullet,
                  { backgroundColor: withAlpha(mineral, SEVERITY_TINT * 2) },
                ]}
              />
              <WxText
                type="body"
                color={colors.textSecondary}
                style={styles.tipText}
              >
                {tip}
              </WxText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    borderWidth: BORDER.rest,
    padding: SPACE.card,
    gap: SPACE.stack,
  },
  head: { flexDirection: "row", gap: SPACE.stack },
  disc: {
    width: LANE.iconDisc,
    height: LANE.iconDisc,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  titles: { flex: 1, gap: SPACE.hair },
  titleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: SPACE.snug,
  },
  badge: {
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACE.cozy,
    paddingVertical: SPACE.hair,
  },
  trend: { gap: SPACE.hair },
  tips: { gap: SPACE.tight },
  tip: { flexDirection: "row", alignItems: "flex-start", gap: SPACE.snug },
  bullet: {
    width: LANE.bullet,
    height: LANE.bullet,
    borderRadius: RADIUS.pill,
    marginTop: SPACE.snug,
  },
  tipText: { flex: 1 },
});
