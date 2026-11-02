/**
 * The Community lane (the web's `CommunityLane`): for each activity the person
 * picked, a 24-hour strip, 12 hours back and 12 ahead in the PLACE's time, one
 * bar per hour. A bar is the activity category's mineral, taller and stronger
 * for a better hour (Excellent to Poor), so the rating never depends on colour
 * alone. The hours are rated by the same suitability rules the advice cards
 * use (`buildLaneCells`), so the lane and the cards cannot disagree.
 *
 * Neighbours' reports sit above the strip as pins, one per hour (the lane's
 * "community" half). Reports are not live yet (`COMMUNITY_REPORTS_ENABLED` in
 * `src/api/reports.ts`), so today there are no pins and a quiet line says so.
 *
 * Each activity's row opens the advice for it, and "All advice" opens the
 * whole sheet: two explicit controls, where the web lays one transparent button
 * over the card (a nested interactive layout VoiceOver reads badly).
 *
 * States: nothing picked (an invitation to pick), loading the rules, failed to
 * load them (try again), ready, and, per hour, no data (a quarter-height grey
 * bar, never a rating).
 */

import { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";

import { ReportTypeIcon } from "@/components/icons/ActivityIcon";
import {
  useActivityCatalogue,
  useSuitabilityRules,
} from "@/hooks/useActivityData";
import { usePageColors } from "@/hooks/usePageColors";
import { useReports } from "@/hooks/useReports";
import { categoryMineral, laneMineral } from "@/shared/activities";
import {
  LANE_HOURS,
  LANE_MAX_ACTIVITIES,
  LANE_PAST_HOURS,
  LEVEL_WORDS,
  type LaneCell,
  type LaneLevel,
  type PinGroup,
  assignPinTiers,
  bestWindow,
  bestWindowText,
  buildLaneCells,
  formatLaneHour,
  groupReportsByHour,
  laneCellMs,
  laneSummary,
} from "@/shared/community-lane";
import { weatherOffsetSeconds } from "@/shared/location-time";
import { getReportTypeInfo } from "@/shared/report-types";
import { type WeatherData } from "@/shared/weather";
import { usePreferences } from "@/state/preferences";
import { BORDER, RADIUS, SIZE, SPACE, TOUCH, withAlpha } from "@/theme/mzizi";
import {
  LANE,
  LANE_ALPHA,
  LANE_HEIGHT,
  LEGEND_HEIGHT,
  NO_DATA_HEIGHT,
  PAST_OPACITY,
  mineralColor,
  inkOn,
} from "@/theme/ratings";

import { selectedActivities } from "./ActivitiesSheet";
import { useActivitySheets } from "./ActivitySheets";
import { PageCard } from "./PageCard";
import { PillButton } from "./PillButton";
import { WxText } from "./WxText";

/** A tick label every six hours (the web labels every three; a phone is narrower). */
export const AXIS_STEP = 6;

/** "2 reports: heavy rain", as the web words a pin's lines. */
export function countLine(count: number, label: string): string {
  return `${count} ${count === 1 ? "report" : "reports"}: ${label.toLowerCase()}`;
}

/** Left edge of a pin's touch target, kept inside the lane. */
export function pinLeft(index: number, laneWidth: number): number {
  const centre = ((index + 0.5) / LANE_HOURS) * laneWidth;
  return Math.min(Math.max(0, centre - TOUCH.min / 2), laneWidth - TOUCH.min);
}

export type CommunityLaneProps = {
  /** The place's slug; keys the neighbours' reports. */
  slug?: string;
  forecast: WeatherData;
  now: Date;
};

export function CommunityLane({ slug, forecast, now }: CommunityLaneProps) {
  const { colors, scheme } = usePageColors();
  const { openPicker, openAdvice } = useActivitySheets();
  const { activities: picked } = usePreferences();
  const { activities: catalogue } = useActivityCatalogue(picked.length > 0);
  const items = useMemo(
    () => selectedActivities(picked, catalogue).slice(0, LANE_MAX_ACTIVITIES),
    [picked, catalogue],
  );
  const { status, rules, retry } = useSuitabilityRules(items.length > 0);
  const reports = useReports(items.length > 0 ? slug : undefined);
  const [laneWidth, setLaneWidth] = useState(0);
  const [openHour, setOpenHour] = useState<number | null>(null);

  const offset = weatherOffsetSeconds(forecast, now);

  const lanes = useMemo(
    () =>
      rules
        ? items.map((activity) => {
            const cells = buildLaneCells(
              activity,
              forecast.hourly,
              rules,
              now,
              offset,
            );
            return { activity, cells, best: bestWindow(cells) };
          })
        : null,
    [items, rules, forecast.hourly, now, offset],
  );

  const pinGroups = useMemo(
    () => groupReportsByHour(reports.reports, now, offset),
    [reports.reports, now, offset],
  );
  const pinTiers = useMemo(
    () => assignPinTiers([...pinGroups.keys()]),
    [pinGroups],
  );
  const tierCount = pinTiers.size ? Math.max(...pinTiers.values()) + 1 : 0;
  const openGroup: PinGroup | undefined =
    openHour !== null ? pinGroups.get(openHour) : undefined;

  if (items.length === 0) {
    return (
      <PageCard title="Community lane" testID="community-lane-empty">
        <WxText type="body" color={colors.textSecondary}>
          Choose the activities you care about and this lane shows, hour by
          hour, when each one is workable over the next day, with what
          neighbours report along the way.
        </WxText>
        <PillButton label="Pick activities" onPress={openPicker} />
      </PageCard>
    );
  }

  const hourLabel = (i: number) =>
    formatLaneHour(laneCellMs(now, i, offset), offset);

  return (
    <PageCard
      title="Community lane"
      testID="community-lane"
      headerEnd={
        <PillButton
          label="All advice"
          variant="outline"
          onPress={() => openAdvice()}
          hint="Opens the advice for every activity you picked"
        />
      }
    >
      <WxText type="bodySm" color={colors.textTertiary}>
        12 hours back and 12 ahead. Bars are taller for better hours.
      </WxText>

      <View
        onLayout={(e: LayoutChangeEvent) =>
          setLaneWidth(e.nativeEvent.layout.width)
        }
        style={styles.stack}
      >
        {tierCount > 0 && laneWidth > 0 ? (
          <View
            accessibilityLabel="Community reports by hour"
            style={{ height: tierCount * TOUCH.min }}
          >
            {[...pinGroups.values()].map((group) => {
              const lead = group.counts[0];
              const expanded = openHour === group.index;
              const lines = group.counts.map((c) =>
                countLine(c.count, getReportTypeInfo(c.type)?.label ?? c.type),
              );
              return (
                <Pressable
                  key={group.index}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  accessibilityLabel={`${hourLabel(group.index)}: ${lines.join(", ")}`}
                  onPress={() => setOpenHour(expanded ? null : group.index)}
                  style={[
                    styles.pinHit,
                    {
                      left: pinLeft(group.index, laneWidth),
                      top: (pinTiers.get(group.index) ?? 0) * TOUCH.min,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.pin,
                      {
                        backgroundColor: mineralColor("copper", colors, scheme),
                        borderColor: expanded
                          ? colors.textPrimary
                          : "transparent",
                      },
                    ]}
                  >
                    <ReportTypeIcon
                      type={lead.type}
                      size={SIZE.iconMd}
                      color={inkOn(mineralColor("copper", colors, scheme))}
                    />
                  </View>
                  <View
                    importantForAccessibility="no-hide-descendants"
                    style={[
                      styles.count,
                      { backgroundColor: colors.textPrimary },
                    ]}
                  >
                    <WxText type="caption" weight={700} color={colors.card}>
                      {group.total}
                    </WxText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {openGroup ? (
          <View
            accessibilityRole="summary"
            accessibilityLabel={`Reports at ${hourLabel(openGroup.index)}`}
            style={[
              styles.panel,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          >
            <WxText type="body" weight={600} color={colors.textPrimary}>
              Reports at {hourLabel(openGroup.index)}
            </WxText>
            {openGroup.counts.map((c) => (
              <WxText key={c.type} type="body" color={colors.textSecondary}>
                {countLine(c.count, getReportTypeInfo(c.type)?.label ?? c.type)}
              </WxText>
            ))}
            <PillButton
              label="Close"
              variant="outline"
              onPress={() => setOpenHour(null)}
            />
          </View>
        ) : null}

        <View
          importantForAccessibility="no-hide-descendants"
          style={styles.axis}
        >
          {Array.from({ length: LANE_HOURS }, (_, i) => i)
            .filter((i) => i % AXIS_STEP === 0)
            .map((i) => (
              <WxText
                key={i}
                type="caption"
                family="mono"
                weight={i === LANE_PAST_HOURS ? 700 : 400}
                color={
                  i === LANE_PAST_HOURS
                    ? colors.textPrimary
                    : colors.textTertiary
                }
                style={{
                  position: "absolute",
                  left: `${(i / LANE_HOURS) * 100}%`,
                }}
              >
                {i === LANE_PAST_HOURS ? "Now" : hourLabel(i)}
              </WxText>
            ))}
        </View>
      </View>

      {status === "loading" || status === "idle" ? (
        <WxText
          type="bodySm"
          color={colors.textTertiary}
          accessibilityRole="progressbar"
          accessibilityLabel="Loading the lane"
        >
          Loading the rules…
        </WxText>
      ) : null}

      {status === "failed" ? (
        <View style={styles.stack} accessibilityRole="alert">
          <WxText type="body" color={colors.textSecondary}>
            Could not load the rules the lane is rated with, so no bar is shown.
            Check your connection and try again.
          </WxText>
          <PillButton label="Try again" variant="outline" onPress={retry} />
        </View>
      ) : (
        <View style={styles.lanes}>
          {(
            lanes ??
            items.map((activity) => ({ activity, cells: null, best: null }))
          ).map((lane) => {
            const mineral = mineralColor(
              laneMineral(lane.activity.category),
              colors,
              scheme,
            );
            const text = mineralColor(
              categoryMineral(lane.activity.category),
              colors,
              scheme,
            );
            const cells: LaneCell[] | null = lane.cells;
            const summary = cells
              ? laneSummary(lane.activity.label, cells, offset)
              : `${lane.activity.label}: loading.`;
            return (
              <Pressable
                key={lane.activity.id}
                accessibilityRole="button"
                accessibilityLabel={summary}
                accessibilityHint={`Opens the advice for ${lane.activity.label}`}
                onPress={() => openAdvice(lane.activity.id)}
                testID={`lane-${lane.activity.id}`}
                style={styles.laneRow}
              >
                <View style={styles.laneHead}>
                  <View style={styles.laneName}>
                    <View style={[styles.dot, { backgroundColor: mineral }]} />
                    <WxText
                      type="body"
                      weight={600}
                      color={colors.textPrimary}
                      style={styles.laneLabel}
                    >
                      {lane.activity.label}
                    </WxText>
                  </View>
                  <WxText type="body" weight={600} color={text}>
                    {lane.best && cells
                      ? `Best: ${bestWindowText(cells, lane.best, "–", offset)}`
                      : cells
                        ? "No good window"
                        : ""}
                  </WxText>
                </View>
                <View
                  importantForAccessibility="no-hide-descendants"
                  style={styles.bars}
                >
                  {(
                    cells ??
                    Array.from({ length: LANE_HOURS }, (_, i) => ({
                      index: i,
                      at: 0,
                      level: null as LaneLevel | null,
                      isPast: i < LANE_PAST_HOURS,
                    }))
                  ).map((cell) => (
                    <View
                      key={cell.index}
                      testID={`lane-${lane.activity.id}-cell-${cell.index}`}
                      style={[
                        styles.cell,
                        cell.index === LANE_PAST_HOURS
                          ? {
                              borderLeftWidth: LANE.nowRule,
                              borderLeftColor: colors.textPrimary,
                            }
                          : null,
                        cell.isPast ? { opacity: PAST_OPACITY } : null,
                      ]}
                    >
                      <View
                        testID={`lane-${lane.activity.id}-bar-${cell.index}`}
                        style={[
                          styles.bar,
                          cell.level
                            ? {
                                height: `${LANE_HEIGHT[cell.level] * 100}%`,
                                backgroundColor: withAlpha(
                                  mineral,
                                  LANE_ALPHA[cell.level],
                                ),
                              }
                            : {
                                height: `${NO_DATA_HEIGHT * 100}%`,
                                backgroundColor: withAlpha(
                                  colors.textTertiary,
                                  LANE_ALPHA.poor,
                                ),
                              },
                        ]}
                      />
                    </View>
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <View accessibilityLabel="How to read the lane" style={styles.legend}>
        {(["excellent", "good", "fair", "poor"] as LaneLevel[]).map((level) => (
          <View key={level} style={styles.legendItem}>
            <View
              importantForAccessibility="no-hide-descendants"
              style={[
                styles.swatch,
                {
                  height: LEGEND_HEIGHT[level],
                  backgroundColor: colors.textSecondary,
                },
              ]}
            />
            <WxText type="bodySm" color={colors.textSecondary}>
              {LEVEL_WORDS[level]}
            </WxText>
          </View>
        ))}
      </View>

      {reports.status === "off" ? (
        <WxText type="bodySm" color={colors.textTertiary}>
          Neighbours&apos; reports will show here as pins once community reports
          are live.
        </WxText>
      ) : null}
    </PageCard>
  );
}

const styles = StyleSheet.create({
  stack: { gap: SPACE.snug },
  lanes: { gap: SPACE.section },
  laneRow: { gap: SPACE.snug, minHeight: TOUCH.min },
  laneHead: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
    columnGap: SPACE.stack,
    rowGap: SPACE.hair,
  },
  laneName: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.snug,
    flexShrink: 1,
  },
  laneLabel: { flexShrink: 1 },
  dot: { width: LANE.dot, height: LANE.dot, borderRadius: RADIUS.pill },
  bars: { flexDirection: "row", height: LANE.bar, gap: LANE.cellGap },
  cell: { flex: 1, justifyContent: "flex-end" },
  bar: { width: "100%", borderRadius: RADIUS.sm },
  axis: { height: LANE.axis },
  pinHit: {
    position: "absolute",
    width: TOUCH.min,
    height: TOUCH.min,
    alignItems: "center",
    justifyContent: "center",
  },
  pin: {
    width: LANE.pin,
    height: LANE.pin,
    borderRadius: RADIUS.pill,
    borderWidth: BORDER.active,
    alignItems: "center",
    justifyContent: "center",
  },
  count: {
    position: "absolute",
    top: SPACE.hair,
    right: SPACE.hair,
    minWidth: LANE.check,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.hair,
    alignItems: "center",
  },
  panel: {
    gap: SPACE.snug,
    padding: SPACE.stack,
    borderRadius: RADIUS.card,
    borderWidth: BORDER.rest,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: SPACE.card,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: SPACE.tight,
  },
  swatch: { width: LANE.legendWidth, borderRadius: RADIUS.sm },
});
