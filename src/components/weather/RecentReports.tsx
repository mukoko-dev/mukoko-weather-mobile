/**
 * The community reports card (the web's `RecentReports`): what people near the
 * place reported in the last 24 hours, each with its type, a severity word, a
 * Verified word when the forecast backed it up, a line of description, how long
 * ago, and an upvote; and a "Report weather" button that opens the wizard.
 *
 * Reports are not live yet (`COMMUNITY_REPORTS_ENABLED` in `src/api/reports.ts`
 * is off: `GET /v1/reports` answers 404 on production). While it is off the
 * card makes no request and says plainly that reports are not live, instead of
 * showing "No reports. Be the first!", which would be untrue advice. Once the
 * routes are live the same card shows loading, failure (try again), empty and
 * the list.
 *
 * Severity and Verified are words on a tint (the severity scale for a value);
 * the card's border is the copper (community) mineral, all the way round.
 */

import { useState } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, View } from "react-native";

import {
  ArrowUpIcon,
  CheckIcon,
  MegaphoneIcon,
  ReportTypeIcon,
} from "@/components/icons/ActivityIcon";
import { usePageColors } from "@/hooks/usePageColors";
import { COMMUNITY_REPORTS_ENABLED } from "@/api/reports";
import { useReports } from "@/hooks/useReports";
import { formatRelative } from "@/shared/i18n";
import { type CommunityReport, getReportTypeInfo } from "@/shared/report-types";
import { BORDER, RADIUS, SIZE, SPACE, TOUCH, withAlpha } from "@/theme/mzizi";
import {
  SEVERITY_TINT,
  mineralColor,
  ratingInk,
  severityColor,
  severityOfReport,
} from "@/theme/ratings";

import { PageCard } from "./PageCard";
import { PillButton } from "./PillButton";
import { ReportWizardSheet } from "./ReportWizardSheet";
import { WxText } from "./WxText";

/** The copper border, as the web's `border-mineral-copper/40`. */
const BORDER_ALPHA = 0.4;

/** The words under a report's heading, for the screen reader and the eye. */
export function reportAge(report: CommunityReport, now: Date): string {
  return formatRelative(new Date(report.reportedAt), now);
}

export type RecentReportsProps = {
  slug?: string;
  name: string;
  now: Date;
  /** Test seam: the switch. Defaults to `COMMUNITY_REPORTS_ENABLED`. */
  enabled?: boolean;
};

export function RecentReports({
  slug,
  name,
  now,
  enabled,
}: RecentReportsProps) {
  const { colors, scheme } = usePageColors();
  const live = enabled ?? COMMUNITY_REPORTS_ENABLED;
  const { status, reports, reload, upvote } = useReports(slug, live);
  const [wizard, setWizard] = useState(false);
  const [voted, setVoted] = useState<ReadonlySet<string>>(new Set());
  // A vote on its way: a second tap cannot send a second one.
  const [voting, setVoting] = useState<ReadonlySet<string>>(new Set());
  const copper = mineralColor("copper", colors, scheme);

  const onUpvote = async (id: string) => {
    if (voting.has(id) || voted.has(id)) return;
    setVoting((prev) => new Set(prev).add(id));
    const counted = await upvote(id);
    setVoting((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (counted) {
      setVoted((prev) => new Set(prev).add(id));
    } else {
      AccessibilityInfo.announceForAccessibility(
        "Your vote could not be counted.",
      );
    }
  };

  return (
    <>
      <PageCard
        title="Community reports"
        borderColor={withAlpha(copper, BORDER_ALPHA)}
        testID="recent-reports"
        headerEnd={
          reports.length > 0 ? (
            <View
              accessibilityLabel={`${reports.length} reports`}
              style={[
                styles.count,
                { backgroundColor: withAlpha(copper, SEVERITY_TINT) },
              ]}
            >
              <WxText type="body" weight={600} color={colors.textPrimary}>
                {reports.length}
              </WxText>
            </View>
          ) : undefined
        }
      >
        {status === "off" && live ? (
          <WxText type="body" color={colors.textSecondary}>
            {name} has no name the weather service knows yet, so it has no
            reports.
          </WxText>
        ) : null}

        {status === "off" && !live ? (
          <WxText type="body" color={colors.textSecondary} testID="reports-off">
            Community reports are not live in the app yet. When they are, what
            people near {name} report in the last 24 hours shows here, and you
            can add your own.
          </WxText>
        ) : null}

        {status === "loading" ? (
          <WxText
            type="body"
            color={colors.textTertiary}
            accessibilityRole="progressbar"
            accessibilityLabel="Loading reports"
          >
            Loading reports…
          </WxText>
        ) : null}

        {status === "failed" ? (
          <View style={styles.block} accessibilityRole="alert">
            <WxText type="body" color={colors.textSecondary}>
              Could not load the reports just now. Try again in a moment.
            </WxText>
            <PillButton label="Try again" variant="outline" onPress={reload} />
          </View>
        ) : null}

        {status === "ready" && reports.length === 0 ? (
          <WxText type="body" color={colors.textSecondary}>
            No reports in the last 24 hours. Be the first!
          </WxText>
        ) : null}

        {status === "ready" && reports.length > 0 ? (
          <View style={styles.list}>
            {reports.map((r) => {
              const info = getReportTypeInfo(r.reportType);
              const sev = severityOfReport(r.severity);
              const tone = severityColor(sev, scheme);
              const ink = ratingInk(sev, scheme, colors);
              const hasVoted = voted.has(r.id);
              const sending = voting.has(r.id);
              return (
                <View
                  key={r.id}
                  style={[
                    styles.row,
                    {
                      borderColor: withAlpha(copper, BORDER_ALPHA),
                      backgroundColor: colors.card,
                    },
                  ]}
                >
                  <ReportTypeIcon
                    type={r.reportType}
                    size={SIZE.iconMd}
                    color={colors.textSecondary}
                  />
                  <View style={styles.main}>
                    <View style={styles.titleRow}>
                      <WxText
                        type="body"
                        weight={600}
                        color={colors.textPrimary}
                      >
                        {info?.label ?? r.reportType}
                      </WxText>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: withAlpha(tone, SEVERITY_TINT) },
                        ]}
                      >
                        <WxText
                          type="caption"
                          weight={700}
                          uppercase
                          color={ink}
                        >
                          {r.severity}
                        </WxText>
                      </View>
                      {r.verified ? (
                        <View
                          style={[
                            styles.badge,
                            {
                              backgroundColor: withAlpha(
                                severityColor("low", scheme),
                                SEVERITY_TINT,
                              ),
                            },
                          ]}
                        >
                          <WxText
                            type="caption"
                            weight={700}
                            color={severityColor("low", scheme)}
                          >
                            Verified
                          </WxText>
                        </View>
                      ) : null}
                    </View>
                    {r.description ? (
                      <WxText
                        type="body"
                        color={colors.textSecondary}
                        numberOfLines={2}
                      >
                        {r.description}
                      </WxText>
                    ) : null}
                    <WxText type="bodySm" color={colors.textTertiary}>
                      {reportAge(r, now)}
                    </WxText>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Upvote report, ${r.upvotes} ${r.upvotes === 1 ? "vote" : "votes"}`}
                    accessibilityState={{
                      selected: hasVoted,
                      disabled: hasVoted || sending,
                    }}
                    disabled={hasVoted || sending}
                    onPress={() => void onUpvote(r.id)}
                    style={styles.vote}
                  >
                    {hasVoted ? (
                      <CheckIcon size={SIZE.iconSm} color={copper} />
                    ) : (
                      <ArrowUpIcon
                        size={SIZE.iconSm}
                        color={colors.textTertiary}
                      />
                    )}
                    {r.upvotes > 0 ? (
                      <WxText
                        type="bodySm"
                        weight={600}
                        color={
                          hasVoted ? colors.textPrimary : colors.textTertiary
                        }
                      >
                        {r.upvotes}
                      </WxText>
                    ) : null}
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : null}

        <PillButton
          label="Report weather"
          icon={(c) => <MegaphoneIcon size={SIZE.iconMd} color={c} />}
          onPress={() => setWizard(true)}
        />
      </PageCard>
      <ReportWizardSheet
        visible={wizard}
        onClose={() => setWizard(false)}
        onSent={reload}
        locationSlug={slug}
        locationName={name}
        enabled={enabled}
      />
    </>
  );
}

const styles = StyleSheet.create({
  block: { gap: SPACE.stack },
  count: {
    minWidth: SIZE.iconMd + SPACE.stack,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.snug,
    paddingVertical: SPACE.hair,
    alignItems: "center",
  },
  list: { gap: SPACE.snug },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.stack,
    padding: SPACE.stack,
    borderRadius: RADIUS.card,
    borderWidth: BORDER.rest,
  },
  main: { flex: 1, gap: SPACE.hair },
  titleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: SPACE.snug,
  },
  badge: {
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACE.snug,
    paddingVertical: SPACE.hair,
  },
  vote: {
    minWidth: TOUCH.min,
    minHeight: TOUCH.min,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACE.hair,
  },
});
