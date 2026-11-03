/**
 * The Weather Map card (the web's `MapPreview`). The web draws a picture from
 * four base-map tiles and links to the full map. The app cannot show either
 * yet: map tiles are third-party data, the app talks to one backend only, and
 * that backend has no tile route (see "API routes needed" in the pull
 * request); the map screen is its own slice. So this card is honest about it:
 * a designed panel that says the map is coming, with no fake tiles and no
 * button that leads nowhere. When the map lands this card becomes the picture
 * and the link.
 */

import { StyleSheet, View } from "react-native";

import { LayersIcon } from "@/components/icons/PlaceIcons";
import { useFarmColors } from "@/hooks/useFarmColors";
import { usePageColors } from "@/hooks/usePageColors";
import { BORDER, RADIUS, SIZE, SPACE } from "@/theme/mzizi";

import { CardBody, CardHeading, PlaceCard } from "./PlaceCard";
import { WxText } from "./WxText";

export function MapPreviewCard({ placeName }: { placeName: string }) {
  const { colors } = usePageColors();
  const farm = useFarmColors();
  return (
    <PlaceCard testID="map-preview-card">
      <CardHeading>Weather Map</CardHeading>
      <View
        accessible
        accessibilityLabel={`The weather map for ${placeName} is not in the app yet`}
        style={[
          styles.panel,
          { backgroundColor: farm.surfaceDim, borderColor: colors.border },
        ]}
      >
        <LayersIcon size={SIZE.iconMd} color={colors.textTertiary} />
        <WxText
          type="body"
          weight={600}
          color={colors.textPrimary}
          align="center"
        >
          The map is coming
        </WxText>
        <WxText type="bodySm" color={colors.textTertiary} align="center">
          Rain, temperature, wind and cloud layers are being built for the app.
        </WxText>
      </View>
      <CardBody>
        Until then, the forecast above is live for {placeName}.
      </CardBody>
    </PlaceCard>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignItems: "center",
    justifyContent: "center",
    gap: SPACE.snug,
    padding: SPACE.card,
    borderRadius: RADIUS.card,
    borderWidth: BORDER.rest,
    minHeight: SIZE.insightMin,
  },
});
