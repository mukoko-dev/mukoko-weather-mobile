/**
 * Chat input bar — a sodalite-outlined card with a multiline TextInput and a
 * circular send button. Mirrors the web app's Claude-style composer.
 *
 * The send button is a 56px touch target (Mzizi touch_targets: comfortable).
 * Input is capped at MAX_MESSAGE_LEN so we never compose a message the server
 * would reject.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { MAX_MESSAGE_LEN } from '@/api/chat';
import { FONT_FAMILY, FONT_SIZE, RADIUS, SPACING, TOUCH_TARGET_MIN } from '@/brand/tokens';
import { BrandText } from '@/components/BrandText';
import { usePalette } from '@/hooks/usePalette';

export type ChatComposerProps = {
  onSend: (text: string) => void;
  /** Disables input + send while a reply is in flight. */
  loading?: boolean;
};

export function ChatComposer({ onSend, loading }: ChatComposerProps) {
  const palette = usePalette();
  const [value, setValue] = useState('');

  const trimmed = value.trim();
  const canSend = trimmed.length > 0 && !loading;

  const handleSend = () => {
    if (!canSend) return;
    onSend(trimmed);
    setValue('');
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.surface, borderColor: palette.sodalite + '40' },
      ]}>
      <TextInput
        value={value}
        onChangeText={setValue}
        editable={!loading}
        placeholder="Ask about weather, locations, activities…"
        placeholderTextColor={palette.textTertiary}
        multiline
        maxLength={MAX_MESSAGE_LEN}
        style={[styles.input, { color: palette.text }]}
        accessibilityLabel="Ask Shamwari"
        submitBehavior="submit"
        onSubmitEditing={handleSend}
        returnKeyType="send"
      />
      <Pressable
        onPress={handleSend}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Send message"
        accessibilityState={{ disabled: !canSend }}
        style={({ pressed }) => [
          styles.sendButton,
          {
            backgroundColor: canSend ? palette.sodalite : palette.borderStrong,
            opacity: pressed && canSend ? 0.85 : 1,
          },
        ]}>
        <BrandText
          variant="title"
          style={{ color: canSend ? palette.onSodalite : palette.textTertiary }}
          accessibilityElementsHidden>
          ↑
        </BrandText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    paddingLeft: SPACING.md,
    paddingRight: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  input: {
    flex: 1,
    fontFamily: FONT_FAMILY.body,
    fontSize: FONT_SIZE.base,
    lineHeight: 22,
    maxHeight: 120,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  sendButton: {
    width: TOUCH_TARGET_MIN,
    height: TOUCH_TARGET_MIN,
    borderRadius: TOUCH_TARGET_MIN / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
