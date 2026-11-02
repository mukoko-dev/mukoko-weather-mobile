/**
 * The breadcrumb trail: Home / Country / Province / Place (the web's rules in
 * src/shared/place-trail.ts). Home is the only link and goes back to the
 * Weather tab; the place closes the trail and is read as the current page. It
 * wraps onto more lines instead of truncating, so a long province or a larger
 * text size never hides a crumb. Separators are drawn but not read.
 */

import { Pressable, StyleSheet, View } from "react-native";

import { type TrailItem, trailText } from "@/shared/place-trail";
import { SPACE, TOUCH, lineHeightOf } from "@/theme/mzizi";

import { WxText } from "./WxText";

export type PlaceTrailProps = {
  items: readonly TrailItem[];
  onHome: () => void;
  color: string;
};

/** The hit area Home gets beyond its text, so the target is `TOUCH.min` tall. */
const HOME_SLOP = Math.max(0, (TOUCH.min - lineHeightOf("bodySm")) / 2);

export function PlaceTrail({ items, onHome, color }: PlaceTrailProps) {
  return (
    <View
      testID="place-trail"
      accessible={false}
      accessibilityLabel={`Breadcrumb: ${trailText(items)}`}
      style={styles.trail}
    >
      {items.map((item, i) => (
        <View key={`${i}-${item.kind}-${item.label}`} style={styles.crumb}>
          {i > 0 ? (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <WxText type="bodySm" color={color}>
                /
              </WxText>
            </View>
          ) : null}
          {item.kind === "home" ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Home"
              accessibilityHint="Goes to the Weather tab"
              onPress={onHome}
              hitSlop={{
                top: HOME_SLOP,
                bottom: HOME_SLOP,
                left: SPACE.snug,
                right: SPACE.snug,
              }}
            >
              <WxText type="bodySm" color={color}>
                {item.label}
              </WxText>
            </Pressable>
          ) : (
            <View
              accessible
              accessibilityLabel={
                item.kind === "current"
                  ? `${item.label}, current page`
                  : item.label
              }
            >
              <WxText
                type="bodySm"
                weight={item.kind === "current" ? 600 : 400}
                color={color}
              >
                {item.label}
              </WxText>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  trail: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: SPACE.tight,
    rowGap: SPACE.hair,
  },
  crumb: { flexDirection: "row", alignItems: "center", gap: SPACE.tight },
});
