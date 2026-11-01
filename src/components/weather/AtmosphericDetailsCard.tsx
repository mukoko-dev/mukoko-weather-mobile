/**
 * The four 24-hour atmospheric charts on /atmosphere (the web's
 * `AtmosphericDetails`): humidity with cloud cover, wind with gusts, pressure,
 * and UV. Each chart is its own section with a heading, and a crash or an
 * empty series in one never takes the others down (each chart draws its own
 * empty message).
 */

import { StyleSheet, View } from "react-native";

import { usePageColors } from "@/hooks/usePageColors";
import { prepareAtmosphericData } from "@/shared/chart-data";
import { type HourlyWeather } from "@/shared/weather";
import { SPACE } from "@/theme/mzizi";

import { HumidityCloudChart } from "./charts/HumidityCloudChart";
import { PressureChart } from "./charts/PressureChart";
import { UVIndexChart } from "./charts/UVIndexChart";
import { WindSpeedChart } from "./charts/WindSpeedChart";
import { ChartErrorBoundary } from "./ChartErrorBoundary";
import { PageCard } from "./PageCard";
import { WxText } from "./WxText";

export type AtmosphericDetailsCardProps = {
  hourly: HourlyWeather;
  utcOffsetSeconds?: number;
  now?: Date;
};

export function AtmosphericDetailsCard({
  hourly,
  utcOffsetSeconds,
  now,
}: AtmosphericDetailsCardProps) {
  const { colors } = usePageColors();
  const data = prepareAtmosphericData(hourly, utcOffsetSeconds, now);
  const sections = [
    {
      title: "Humidity & Cloud Cover",
      chart: <HumidityCloudChart data={data} />,
    },
    { title: "Wind Speed & Gusts", chart: <WindSpeedChart data={data} /> },
    { title: "Barometric Pressure", chart: <PressureChart data={data} /> },
    { title: "UV Index", chart: <UVIndexChart data={data} /> },
  ];
  return (
    <PageCard
      title="Atmospheric Details"
      subtitle="24-hour hourly trends"
      tone="quiet"
      testID="atmospheric-details-card"
    >
      <View style={styles.sections}>
        {sections.map((s) => (
          <View key={s.title} style={styles.section}>
            <WxText
              type="body"
              weight={600}
              color={colors.textSecondary}
              accessibilityRole="header"
            >
              {s.title}
            </WxText>
            <ChartErrorBoundary
              name={s.title.toLowerCase()}
              color={colors.textTertiary}
            >
              {s.chart}
            </ChartErrorBoundary>
          </View>
        ))}
      </View>
    </PageCard>
  );
}

const styles = StyleSheet.create({
  sections: { gap: SPACE.card },
  section: { gap: SPACE.snug },
});
