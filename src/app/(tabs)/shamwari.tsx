/**
 * Shamwari tab — the in-app AI weather assistant (Claude-app style).
 *
 * Full-viewport chat: a scrolling transcript of user + assistant turns, a
 * typing indicator while a reply is in flight, and an input bar pinned above
 * the bottom tab nav. On the empty state we greet the user and offer
 * suggested-prompt chips.
 *
 * Wiring: POST /api/py/chat via the typed client in src/api/chat.ts. Loading,
 * errors and rate-limits degrade gracefully to an on-brand fallback reply.
 *
 * Surface mineral: sodalite (Mzizi — AI / deep-reasoning). See the chat
 * components under src/components/chat.
 */

import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import {
  sendChatMessage,
  type ChatHistoryMessage,
  type ChatReference,
} from '@/api/chat';
import { SPACING } from '@/brand/tokens';
import { BrandText } from '@/components/BrandText';
import { Header } from '@/components/Header';
import { ChatBubble, type ChatMessage } from '@/components/chat/ChatBubble';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { DEFAULT_SUGGESTED_PROMPTS } from '@/components/chat/prompts';
import { SuggestedPrompts } from '@/components/chat/SuggestedPrompts';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { usePalette } from '@/hooks/usePalette';

/** Cap rendered turns to keep memory bounded in long conversations. */
const MAX_RENDERED_MESSAGES = 30;

let messageSeq = 0;
function nextId(prefix: string): string {
  messageSeq += 1;
  return `${prefix}-${Date.now()}-${messageSeq}`;
}

export default function ShamwariScreen() {
  const palette = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const scrollToEnd = useCallback(() => {
    // Deferred so the list has laid out the new row before we scroll.
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMessage: ChatMessage = {
        id: nextId('user'),
        role: 'user',
        content: trimmed,
      };

      // Snapshot history BEFORE appending the new user turn (the new message is
      // sent separately as `message`). Cap to the server's history window.
      const history: ChatHistoryMessage[] = messages
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [...prev, userMessage].slice(-MAX_RENDERED_MESSAGES));
      setLoading(true);

      // Cancel any in-flight request before starting a new one.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const data = await sendChatMessage({
          message: trimmed,
          history,
          signal: controller.signal,
        });
        const assistantMessage: ChatMessage = {
          id: nextId('assistant'),
          role: 'assistant',
          content: data.response,
          references: data.references,
          isError: data.error,
        };
        setMessages((prev) => [...prev, assistantMessage].slice(-MAX_RENDERED_MESSAGES));
      } catch (err) {
        // Ignore user-initiated cancellations (unmount / rapid resend).
        if (err instanceof Error && err.name === 'AbortError') return;
        setMessages((prev) =>
          [
            ...prev,
            {
              id: nextId('error'),
              role: 'assistant',
              content:
                "I'm having trouble connecting right now. Please try again in a moment.",
              isError: true,
            } satisfies ChatMessage,
          ].slice(-MAX_RENDERED_MESSAGES),
        );
      } finally {
        setLoading(false);
      }
    },
    [loading, messages],
  );

  const handleReferencePress = useCallback(
    (reference: ChatReference) => {
      router.push({ pathname: '/location/[slug]', params: { slug: reference.slug } });
    },
    [router],
  );

  const isEmpty = messages.length === 0;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: palette.background }]}
      edges={['top']}>
      <Header title="Shamwari" subtitle="Your weather friend" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <FlatList
          ref={listRef}
          style={styles.flex}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={[
            styles.listContent,
            isEmpty && styles.listContentEmpty,
          ]}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToEnd}
          renderItem={({ item }) => (
            <ChatBubble message={item} onReferencePress={handleReferencePress} />
          )}
          ListEmptyComponent={
            <EmptyState onSelect={sendMessage} disabled={loading} />
          }
          ListFooterComponent={loading ? <TypingIndicator /> : null}
        />
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, SPACING.sm) }]}>
          <ChatComposer onSend={sendMessage} loading={loading} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function EmptyState({
  onSelect,
  disabled,
}: {
  onSelect: (query: string) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.empty}>
      <BrandText variant="display" tone="sodalite" accessibilityElementsHidden>
        ✦
      </BrandText>
      <BrandText variant="title" tone="text" style={styles.emptyCentered}>
        Meet Shamwari
      </BrandText>
      <BrandText variant="body" tone="textSecondary" style={styles.emptyCopy}>
        Your weather friend. Ask about the forecast, farming windows, frost risk,
        safari plans, or what to wear — anywhere in the world.
      </BrandText>
      <BrandText variant="smallBold" tone="textTertiary" style={styles.emptyLabel}>
        Try asking
      </BrandText>
      <SuggestedPrompts
        prompts={DEFAULT_SUGGESTED_PROMPTS}
        onSelect={onSelect}
        disabled={disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  listContent: {
    padding: SPACING.md,
    gap: SPACING.lg,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xl,
  },
  emptyCentered: {
    textAlign: 'center',
  },
  emptyCopy: {
    textAlign: 'center',
    maxWidth: 340,
    marginBottom: SPACING.md,
  },
  emptyLabel: {
    alignSelf: 'flex-start',
  },
  composer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
});
