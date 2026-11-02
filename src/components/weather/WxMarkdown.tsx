/**
 * Shamwari's short markdown (bold and bullet lists) as weather-page text: the
 * pure parser of the Shamwari tab (`src/components/chat/markdown.ts`) drawn
 * with `WxText`, so an AI summary on the weather page uses the page's type
 * scale and colours, not the chat tab's.
 */

import { StyleSheet, Text, View } from "react-native";

import { usePageColors } from "@/hooks/usePageColors";
import { SPACE } from "@/theme/mzizi";

import { parseMarkdown } from "../chat/markdown";
import { WxText } from "./WxText";

export function WxMarkdown({ content }: { content: string }) {
  const { colors } = usePageColors();
  return (
    <View style={styles.stack}>
      {parseMarkdown(content).map((block, bi) =>
        block.type === "bullet" ? (
          <View key={bi} style={styles.stack}>
            {block.items.map((spans, ii) => (
              <View key={ii} style={styles.bullet}>
                <WxText type="body" color={colors.textSecondary}>
                  {"•"}
                </WxText>
                <WxText
                  type="body"
                  color={colors.textSecondary}
                  style={styles.fill}
                >
                  {spans.map((s, si) => (
                    <Text key={si} style={s.bold ? styles.bold : undefined}>
                      {s.text}
                    </Text>
                  ))}
                </WxText>
              </View>
            ))}
          </View>
        ) : (
          <WxText key={bi} type="body" color={colors.textSecondary}>
            {block.spans.map((s, si) => (
              <Text key={si} style={s.bold ? styles.bold : undefined}>
                {s.text}
              </Text>
            ))}
          </WxText>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: SPACE.snug },
  bullet: { flexDirection: "row", gap: SPACE.snug },
  fill: { flex: 1 },
  bold: { fontFamily: "NotoSans_600SemiBold" },
});
