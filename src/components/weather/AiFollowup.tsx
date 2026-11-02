/**
 * The inline follow-up chat under the AI insight (the web's `AISummaryChat`):
 * a collapsed card "Ask a follow-up question" that opens to a short
 * conversation, at most five questions, then a pointer to the Shamwari tab.
 *
 * It exists only for a signed-in person with a loaded insight, as on the web.
 * Signed out (the only state today, because sign-in is switched off) the page
 * shows nothing for it: the insight card above already says why. Nothing the
 * person picked (their activities) is sent.
 *
 * States: collapsed, ready (empty), sending, reply, a reply that failed (shown
 * as the assistant's line, as the web does), and the limit reached.
 */

import { router } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import {
  type FollowupTurn,
  MAX_FOLLOWUP_MESSAGES,
  sendFollowup,
} from "@/api/ai";
import {
  ChevronDownIcon,
  ChevronUpIcon,
} from "@/components/icons/ActivityIcon";
import { SparklesIcon } from "@/components/icons/Icon";
import { usePageColors } from "@/hooks/usePageColors";
import { useSignedIn } from "@/hooks/useSignedIn";
import { BORDER, RADIUS, SIZE, SPACE, TOUCH, withAlpha } from "@/theme/mzizi";
import { SEVERITY_TINT, mineralColor } from "@/theme/ratings";

import { PillButton } from "./PillButton";
import { WxMarkdown } from "./WxMarkdown";
import { WxText } from "./WxText";

const BORDER_ALPHA = 0.4;

export type AiFollowupProps = {
  name: string;
  slug: string;
  insight: string | null;
  season?: string;
  signInAvailable?: boolean;
};

export function AiFollowup({
  name,
  slug,
  insight,
  season,
  signInAvailable,
}: AiFollowupProps) {
  const { colors, scheme } = usePageColors();
  const { signedIn } = useSignedIn(signInAvailable);
  const tanzanite = mineralColor("tanzanite", colors, scheme);
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<FollowupTurn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const abort = useRef<AbortController | null>(null);

  if (!signedIn || !insight) return null;

  const asked = turns.filter((t) => t.role === "user").length;
  const atLimit = asked >= MAX_FOLLOWUP_MESSAGES;

  const send = async () => {
    const text = input.trim();
    if (!text || sending || atLimit) return;
    const history = turns;
    setTurns([...history, { role: "user", content: text }]);
    setInput("");
    setSending(true);
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    try {
      const reply = await sendFollowup(
        {
          message: text,
          locationName: name,
          locationSlug: slug,
          weatherSummary: insight,
          season,
          history,
        },
        controller.signal,
      );
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: reply.response },
      ]);
    } catch {
      /* cancelled: nothing to show */
    } finally {
      setSending(false);
    }
  };

  return (
    <View
      testID="ai-followup"
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: withAlpha(tanzanite, BORDER_ALPHA),
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ask a follow-up question"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={styles.toggle}
      >
        <View style={styles.toggleTitle}>
          <SparklesIcon size={SIZE.iconSm} color={tanzanite} />
          <WxText type="body" weight={600} color={colors.textPrimary}>
            Ask a follow-up question
          </WxText>
        </View>
        {open ? (
          <ChevronUpIcon size={SIZE.iconSm} color={colors.textTertiary} />
        ) : (
          <ChevronDownIcon size={SIZE.iconSm} color={colors.textTertiary} />
        )}
      </Pressable>

      {open ? (
        <View style={[styles.body, { borderTopColor: colors.border }]}>
          <View accessibilityLiveRegion="polite" style={styles.turns}>
            {turns.map((t, i) => (
              <View
                key={i}
                style={[
                  styles.turn,
                  t.role === "user"
                    ? {
                        backgroundColor: withAlpha(
                          colors.primary,
                          SEVERITY_TINT,
                        ),
                        alignSelf: "flex-end",
                      }
                    : {
                        backgroundColor: colors.background,
                        alignSelf: "flex-start",
                      },
                ]}
              >
                {t.role === "assistant" ? (
                  <WxMarkdown content={t.content} />
                ) : (
                  <WxText type="body" color={colors.textPrimary}>
                    {t.content}
                  </WxText>
                )}
              </View>
            ))}
            {sending ? (
              <WxText
                type="body"
                color={colors.textTertiary}
                accessibilityRole="progressbar"
                accessibilityLabel="Waiting for the reply"
              >
                Waiting for the reply…
              </WxText>
            ) : null}
          </View>

          {atLimit ? (
            <View style={styles.turns}>
              <WxText type="body" color={colors.textSecondary}>
                You have reached the follow-up limit for this conversation. For
                a deeper one, continue in Shamwari.
              </WxText>
              <PillButton
                label="Continue in Shamwari"
                variant="outline"
                onPress={() => router.navigate("/shamwari")}
              />
            </View>
          ) : (
            <View style={styles.composer}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ask about this weather"
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel="Follow-up question"
                editable={!sending}
                multiline
                maxLength={2000}
                style={[
                  styles.input,
                  {
                    color: colors.textPrimary,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
              />
              <PillButton
                label="Send"
                disabled={sending || input.trim().length === 0}
                onPress={() => void send()}
              />
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    borderWidth: BORDER.rest,
    overflow: "hidden",
  },
  toggle: {
    minHeight: TOUCH.default,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACE.stack,
    paddingHorizontal: SPACE.card,
  },
  toggleTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.snug,
    flex: 1,
  },
  body: { gap: SPACE.stack, padding: SPACE.card, borderTopWidth: BORDER.rest },
  turns: { gap: SPACE.snug },
  turn: { maxWidth: "90%", padding: SPACE.stack, borderRadius: RADIUS.input },
  composer: { gap: SPACE.snug },
  input: {
    minHeight: TOUCH.default,
    padding: SPACE.stack,
    borderRadius: RADIUS.input,
    borderWidth: BORDER.rest,
  },
});
