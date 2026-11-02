/**
 * The report wizard (the web's `WeatherReportModal`): three steps in a sheet.
 *
 *   1. Choose what you are seeing (13 types).
 *   2. Say more: two short questions to think about (the Worker's fixed
 *      fallback questions; the model's questions need `POST /v1/reports/clarify`,
 *      which no Worker serves yet), a severity, and an optional description of
 *      up to 300 characters.
 *   3. Confirmation.
 *
 * It is built against the real submit contract (`submitReport` in
 * `src/api/reports.ts`: the place's slug and the person's choices, no
 * coordinate). Submitting is behind `COMMUNITY_REPORTS_ENABLED`, which is OFF
 * until the routes are deployed. While it is off the sheet says so at the top
 * of every step, the Send button is disabled and says why, and nothing is
 * sent, so nobody fills a form in believing it goes anywhere.
 *
 * States: start (types), progress (sending), failure (the reason in plain
 * words, the draft kept so it can be sent again), end (sent), plus the
 * not-live state above.
 */

import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import {
  COMMUNITY_REPORTS_ENABLED,
  reportFailureMessage,
  submitReport,
} from "@/api/reports";
import { CheckIcon, ReportTypeIcon } from "@/components/icons/ActivityIcon";
import { usePageColors } from "@/hooks/usePageColors";
import {
  MAX_DESCRIPTION,
  REPORT_TYPES,
  SEVERITIES,
  type ReportSeverity,
  checkReportDraft,
  fallbackQuestions,
  getReportTypeInfo,
} from "@/shared/report-types";
import { BORDER, RADIUS, SIZE, SPACE, TOUCH, withAlpha } from "@/theme/mzizi";
import { SEVERITY_TINT, inkOn, severityColor } from "@/theme/ratings";

import { SINGLE_COLUMN_FONT_SCALE } from "./InsightCard";
import { DetailSheet } from "./DetailSheet";
import { PillButton } from "./PillButton";
import { WxText } from "./WxText";

type Step = "select" | "clarify" | "sent";

export type ReportWizardSheetProps = {
  visible: boolean;
  onClose: () => void;
  locationSlug: string | undefined;
  locationName: string;
  /** Test seam: the switch. Defaults to `COMMUNITY_REPORTS_ENABLED`. */
  enabled?: boolean;
};

export function ReportWizardSheet({
  visible,
  onClose,
  locationSlug,
  locationName,
  enabled = COMMUNITY_REPORTS_ENABLED,
}: ReportWizardSheetProps) {
  const { colors, scheme } = usePageColors();
  const { fontScale } = useWindowDimensions();
  const [step, setStep] = useState<Step>("select");
  const [reportType, setReportType] = useState<string | null>(null);
  const [severity, setSeverity] = useState<ReportSeverity>("moderate");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  // A closed sheet forgets the draft, and stops a request still in flight.
  useEffect(() => {
    if (visible) return;
    abort.current?.abort();
    setStep("select");
    setReportType(null);
    setSeverity("moderate");
    setDescription("");
    setSending(false);
    setError(null);
  }, [visible]);

  const info = reportType ? getReportTypeInfo(reportType) : undefined;
  const columns = fontScale > SINGLE_COLUMN_FONT_SCALE ? 1 : 2;

  const send = async () => {
    const draft = { reportType, severity, description };
    const problem = checkReportDraft(draft);
    if (problem) {
      setError(problem);
      return;
    }
    if (!locationSlug) {
      setError(
        "This place has no name the weather service knows, so it cannot take a report.",
      );
      return;
    }
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setSending(true);
    setError(null);
    try {
      await submitReport(locationSlug, draft, {
        signal: controller.signal,
        enabled,
      });
      setStep("sent");
    } catch (err) {
      if (!controller.signal.aborted) setError(reportFailureMessage(err));
    } finally {
      setSending(false);
    }
  };

  const rows: (typeof REPORT_TYPES)[number][][] = [];
  for (let i = 0; i < REPORT_TYPES.length; i += columns) {
    rows.push(REPORT_TYPES.slice(i, i + columns));
  }

  const footer =
    step === "clarify" ? (
      <View style={styles.footer}>
        <PillButton
          label="Back"
          variant="outline"
          size="md"
          disabled={sending}
          onPress={() => {
            setStep("select");
            setReportType(null);
            setError(null);
          }}
        />
        <View style={styles.fill}>
          <PillButton
            label={sending ? "Sending…" : "Send report"}
            size="md"
            stretch
            disabled={!enabled || sending}
            hint={
              enabled ? undefined : "Sending reports is not switched on yet"
            }
            onPress={() => void send()}
          />
        </View>
      </View>
    ) : step === "sent" ? (
      <PillButton label="Done" size="md" stretch onPress={onClose} />
    ) : undefined;

  return (
    <DetailSheet
      open={visible}
      title={step === "sent" ? "Report sent" : "Report weather"}
      description={
        step === "select"
          ? "What are you seeing right now?"
          : step === "clarify" && info
            ? `Tell us more about the ${info.label.toLowerCase()}.`
            : step === "sent"
              ? "Thank you for helping your community."
              : undefined
      }
      onClose={onClose}
      footer={footer}
      testID="report-wizard"
    >
      {!enabled && step !== "sent" ? (
        <View
          accessibilityRole="alert"
          testID="reports-not-live"
          style={[
            styles.notice,
            {
              borderColor: severityColor("moderate", scheme),
              backgroundColor: withAlpha(
                severityColor("moderate", scheme),
                SEVERITY_TINT,
              ),
            },
          ]}
        >
          <WxText type="body" weight={600} color={colors.textPrimary}>
            Sending reports is not switched on yet.
          </WxText>
          <WxText type="body" color={colors.textSecondary}>
            You can look through the steps. Nothing you choose or write is sent
            anywhere.
          </WxText>
        </View>
      ) : null}

      {step === "select" ? (
        <View accessibilityLabel="Weather condition type" style={styles.grid}>
          {rows.map((row) => (
            <View key={row[0].id} style={styles.row}>
              {row.map((t) => (
                <Pressable
                  key={t.id}
                  accessibilityRole="button"
                  accessibilityLabel={t.label}
                  onPress={() => {
                    setReportType(t.id);
                    setStep("clarify");
                  }}
                  testID={`report-type-${t.id}`}
                  style={[
                    styles.type,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                >
                  <ReportTypeIcon
                    type={t.id}
                    size={SIZE.iconMd}
                    color={colors.textSecondary}
                  />
                  <WxText
                    type="body"
                    weight={600}
                    color={colors.textPrimary}
                    style={styles.fill}
                  >
                    {t.label}
                  </WxText>
                </Pressable>
              ))}
              {row.length < columns ? <View style={styles.fill} /> : null}
            </View>
          ))}
        </View>
      ) : null}

      {step === "clarify" && reportType ? (
        <>
          <View
            style={[
              styles.questions,
              { backgroundColor: withAlpha(colors.primary, SEVERITY_TINT / 2) },
            ]}
          >
            <WxText type="body" weight={600} color={colors.textPrimary}>
              Help us understand
            </WxText>
            {fallbackQuestions(reportType).map((q) => (
              <WxText key={q} type="body" color={colors.textSecondary}>
                {q}
              </WxText>
            ))}
          </View>

          <View style={styles.group}>
            <WxText type="body" weight={600} color={colors.textPrimary}>
              Severity
            </WxText>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel="Report severity"
              style={styles.severities}
            >
              {SEVERITIES.map((s) => {
                const on = severity === s.id;
                return (
                  <Pressable
                    key={s.id}
                    accessibilityRole="radio"
                    accessibilityLabel={`${s.label}: ${s.description}`}
                    accessibilityState={{ checked: on }}
                    onPress={() => setSeverity(s.id)}
                    style={[
                      styles.severity,
                      on
                        ? {
                            borderColor: colors.primary,
                            backgroundColor: withAlpha(
                              colors.primary,
                              SEVERITY_TINT,
                            ),
                            borderWidth: BORDER.active,
                          }
                        : {
                            borderColor: colors.border,
                            borderWidth: BORDER.rest,
                          },
                    ]}
                  >
                    <WxText
                      type="body"
                      weight={600}
                      color={on ? colors.primary : colors.textSecondary}
                    >
                      {s.label}
                    </WxText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.group}>
            <WxText type="body" weight={600} color={colors.textPrimary}>
              Description{" "}
              <WxText type="body" color={colors.textTertiary}>
                (optional)
              </WxText>
            </WxText>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Add any details about what you are seeing"
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel="Description, optional"
              multiline
              maxLength={MAX_DESCRIPTION}
              textAlignVertical="top"
              style={[
                styles.input,
                {
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
            />
            <WxText
              type="bodySm"
              color={colors.textTertiary}
              accessibilityLabel={`${description.length} of ${MAX_DESCRIPTION} characters`}
            >
              {description.length}/{MAX_DESCRIPTION}
            </WxText>
          </View>

          {error ? (
            <WxText
              type="body"
              color={severityColor("severe", scheme)}
              accessibilityRole="alert"
            >
              {error}
            </WxText>
          ) : null}
        </>
      ) : null}

      {step === "sent" ? (
        <View style={styles.sent}>
          <View
            style={[
              styles.sentDisc,
              { backgroundColor: severityColor("low", scheme) },
            ]}
          >
            <CheckIcon
              size={SIZE.iconMd}
              color={inkOn(severityColor("low", scheme))}
            />
          </View>
          <WxText type="body" color={colors.textSecondary} align="center">
            Your {info?.label.toLowerCase() ?? "weather"} report for{" "}
            {locationName} has been sent. Other people near it will see it.
          </WxText>
        </View>
      ) : null}
    </DetailSheet>
  );
}

const styles = StyleSheet.create({
  notice: {
    gap: SPACE.hair,
    padding: SPACE.stack,
    borderRadius: RADIUS.card,
    borderWidth: BORDER.rest,
  },
  grid: { gap: SPACE.snug },
  row: { flexDirection: "row", gap: SPACE.snug },
  fill: { flex: 1 },
  type: {
    flex: 1,
    minHeight: TOUCH.min,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.cozy,
    paddingHorizontal: SPACE.stack,
    paddingVertical: SPACE.cozy,
    borderRadius: RADIUS.input,
    borderWidth: BORDER.rest,
  },
  questions: {
    gap: SPACE.snug,
    padding: SPACE.stack,
    borderRadius: RADIUS.input,
  },
  group: { gap: SPACE.snug },
  severities: { flexDirection: "row", gap: SPACE.snug },
  severity: {
    flex: 1,
    minHeight: TOUCH.min,
    borderRadius: RADIUS.input,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACE.snug,
  },
  input: {
    minHeight: TOUCH.default + TOUCH.min,
    padding: SPACE.stack,
    borderRadius: RADIUS.input,
    borderWidth: BORDER.rest,
  },
  footer: { flexDirection: "row", gap: SPACE.snug, alignItems: "center" },
  sent: { alignItems: "center", gap: SPACE.stack, paddingVertical: SPACE.card },
  sentDisc: {
    width: TOUCH.min,
    height: TOUCH.min,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
