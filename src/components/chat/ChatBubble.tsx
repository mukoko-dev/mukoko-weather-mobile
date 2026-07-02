/**
 * A single chat turn.
 *
 * User turns render as a right-aligned sodalite bubble (the Shamwari / AI
 * mineral). Assistant turns render full-width, Claude-app style — a small
 * sodalite avatar dot beside markdown-rendered text, with any location
 * references as tappable quick-link chips underneath.
 */

import { Pressable, StyleSheet, View } from 'react-native';

import { RADIUS, SPACING } from '@/brand/tokens';
import { BrandText } from '@/components/BrandText';
import { usePalette } from '@/hooks/usePalette';
import type { ChatReference } from '@/api/chat';
import { MarkdownText } from './MarkdownText';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  references?: ChatReference[];
  /** Marks a graceful fallback reply so we can tint it as a soft error. */
  isError?: boolean;
};

export type ChatBubbleProps = {
  message: ChatMessage;
  /** Called when a location reference chip is tapped. */
  onReferencePress?: (reference: ChatReference) => void;
};

export function ChatBubble({ message, onReferencePress }: ChatBubbleProps) {
  const palette = usePalette();
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View
          accessibilityRole="text"
          accessibilityLabel={`You said: ${message.content}`}
          style={[styles.userBubble, { backgroundColor: palette.sodalite }]}>
          <BrandText variant="body" style={{ color: palette.onSodalite }}>
            {message.content}
          </BrandText>
        </View>
      </View>
    );
  }

  const references = (message.references ?? []).filter(
    (ref) => ref.type === 'location' || ref.type === 'weather',
  );

  return (
    <View
      style={styles.assistantRow}
      accessible
      accessibilityLabel={`Shamwari said: ${message.content}`}>
      <View style={[styles.avatar, { backgroundColor: palette.sodalite + '1F' }]}>
        <BrandText variant="smallBold" tone="sodalite" accessibilityElementsHidden>
          ✦
        </BrandText>
      </View>
      <View style={styles.assistantBody}>
        <MarkdownText content={message.content} tone={message.isError ? 'textSecondary' : 'text'} />
        {references.length > 0 ? (
          <View style={styles.refRow}>
            {references.slice(0, 5).map((ref) => (
              <Pressable
                key={ref.slug}
                onPress={() => onReferencePress?.(ref)}
                accessibilityRole="link"
                accessibilityLabel={`Open weather for ${ref.name}`}
                style={({ pressed }) => [
                  styles.refChip,
                  {
                    backgroundColor: palette.sodalite + '1A', // ~10% alpha
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}>
                <BrandText variant="smallBold" tone="sodalite">
                  {`📍 ${ref.name}`}
                </BrandText>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  userBubble: {
    maxWidth: '85%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.card,
  },
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  assistantBody: {
    flex: 1,
    gap: SPACING.sm,
  },
  refRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  refChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.pill,
  },
});
