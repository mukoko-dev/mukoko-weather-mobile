/**
 * A section's title and, optionally, one action at its right (the web's
 * `SectionHeader`): "Conditions" with "Full forecast", the tile section with
 * "24h trends". The action is a real control, at least 48 dp tall, spoken as a
 * link with a name that says where it goes. Drawn with a chevron, not an arrow
 * character, so it never turns into an emoji.
 */

import { Pressable, StyleSheet, View } from "react-native";

import { ChevronRightIcon } from "@/components/icons/Icon";
import { SIZE, SPACE, TOUCH } from "@/theme/mzizi";

import { WxText } from "./WxText";

export type SectionAction = {
  label: string;
  /** What VoiceOver says; defaults to the label. */
  spoken?: string;
  onPress: () => void;
  testID?: string;
};

export type SectionHeaderProps = {
  title: string;
  action?: SectionAction;
  /** The title colour (the sky's white, or the page's text). */
  titleColor: string;
  /** The action's colour. */
  actionColor: string;
};

export function SectionHeader({
  title,
  action,
  titleColor,
  actionColor,
}: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <WxText
        type="h6"
        weight={600}
        family="serif"
        color={titleColor}
        accessibilityRole="header"
        style={styles.title}
      >
        {title}
      </WxText>
      {action ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={action.spoken ?? action.label}
          onPress={action.onPress}
          testID={action.testID}
          hitSlop={SPACE.snug}
          style={styles.action}
        >
          <WxText type="body" weight={600} color={actionColor}>
            {action.label}
          </WxText>
          <ChevronRightIcon size={SIZE.iconSm} color={actionColor} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACE.snug,
  },
  title: { flexShrink: 1 },
  action: {
    minHeight: TOUCH.min,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.hair,
  },
});
