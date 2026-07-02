/**
 * Renders Shamwari's markdown-ish assistant text as native React Native text.
 *
 * Uses the pure parser in ./markdown to turn a reply into paragraphs and
 * bullet lists, then maps each block onto BrandText so it inherits the app's
 * typography + palette. Bold spans switch to the semibold font family. No
 * heavy markdown dependency — just <Text> and <View>.
 */

import { StyleSheet, Text, View } from 'react-native';

import { FONT_FAMILY, SPACING } from '@/brand/tokens';
import { BrandText } from '@/components/BrandText';
import { parseMarkdown, type InlineSpan } from './markdown';

type Tone = 'text' | 'textSecondary';

export type MarkdownTextProps = {
  content: string;
  /** Body text tone. Assistant copy defaults to the primary text colour. */
  tone?: Tone;
};

function renderSpans(spans: InlineSpan[], keyPrefix: string) {
  return spans.map((span, i) => (
    <Text key={`${keyPrefix}-${i}`} style={span.bold ? styles.bold : undefined}>
      {span.text}
    </Text>
  ));
}

export function MarkdownText({ content, tone = 'text' }: MarkdownTextProps) {
  const blocks = parseMarkdown(content);

  return (
    <View style={styles.container}>
      {blocks.map((block, bi) => {
        if (block.type === 'bullet') {
          return (
            <View key={`b-${bi}`} style={styles.bulletList}>
              {block.items.map((item, ii) => (
                <View key={`b-${bi}-${ii}`} style={styles.bulletRow}>
                  <BrandText variant="body" tone={tone} style={styles.bulletDot}>
                    {'•'}
                  </BrandText>
                  <BrandText variant="body" tone={tone} style={styles.bulletText}>
                    {renderSpans(item, `b-${bi}-${ii}`)}
                  </BrandText>
                </View>
              ))}
            </View>
          );
        }
        return (
          <BrandText key={`p-${bi}`} variant="body" tone={tone}>
            {renderSpans(block.spans, `p-${bi}`)}
          </BrandText>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.sm,
  },
  bold: {
    fontFamily: FONT_FAMILY.bodyBold,
  },
  bulletList: {
    gap: SPACING.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  bulletDot: {
    lineHeight: 24,
  },
  bulletText: {
    flex: 1,
  },
});
