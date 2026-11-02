/**
 * "For your crops" (the web's `AgricultureCropAdvice`): deterministic,
 * crop-aware notes for the farming activities the person chose, from the same
 * farm data the page shows (no AI call). With no crop chosen it says how to
 * choose one; with crops but nothing to act on it says that.
 */

import { StyleSheet, View } from "react-native";

import { useFarmColors } from "@/hooks/useFarmColors";
import { usePageColors } from "@/hooks/usePageColors";
import { type CropAdvice } from "@/shared/agriculture";
import { SPACE } from "@/theme/mzizi";

import { PillButton } from "./PillButton";
import { CardBody, CardHeading, PlaceCard } from "./PlaceCard";
import { WxText } from "./WxText";

export type AgricultureCropAdviceProps = {
  advice: readonly CropAdvice[];
  /** Farming activities the person has chosen. */
  crops: readonly string[];
  onPickCrops: () => void;
};

export function AgricultureCropAdvice({
  advice,
  crops,
  onPickCrops,
}: AgricultureCropAdviceProps) {
  const { colors } = usePageColors();
  const farm = useFarmColors();
  return (
    <PlaceCard accent="quiet" testID="crop-advice">
      <CardHeading>For your crops</CardHeading>
      {crops.length > 0 && advice.length === 0 ? (
        <CardBody>
          Nothing in this week&apos;s forecast needs special action for your
          crops. The windows and charts on this page still apply.
        </CardBody>
      ) : advice.length === 0 ? (
        <>
          <CardBody>
            Tell us what you farm to see advice for your crops and livestock.
          </CardBody>
          <PillButton
            label="Pick your crops"
            variant="outline"
            onPress={onPickCrops}
          />
        </>
      ) : (
        <View style={styles.crops}>
          {advice.map((c) => (
            <View key={c.id} style={styles.crop}>
              <WxText
                type="body"
                weight={600}
                color={farm.malachite}
                accessibilityRole="header"
              >
                {c.label}
              </WxText>
              {c.tips.map((tip) => (
                <View key={tip} style={styles.tip}>
                  <WxText type="body" color={colors.textSecondary}>
                    •
                  </WxText>
                  <View style={styles.tipText}>
                    <CardBody>{tip}</CardBody>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </PlaceCard>
  );
}

const styles = StyleSheet.create({
  crops: { gap: SPACE.card },
  crop: { gap: SPACE.snug },
  tip: { flexDirection: "row", gap: SPACE.snug },
  tipText: { flex: 1 },
});
