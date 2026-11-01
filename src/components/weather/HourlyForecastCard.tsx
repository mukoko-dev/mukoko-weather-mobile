/** The 24-hour forecast card on /forecast (the web's `HourlyForecast`). */

import { type HourlyWeather } from "@/shared/weather";

import { HourlyChart } from "./charts/HourlyChart";
import { PageCard } from "./PageCard";

export type HourlyForecastCardProps = {
  hourly: HourlyWeather;
  utcOffsetSeconds?: number;
  now?: Date;
};

export function HourlyForecastCard({
  hourly,
  utcOffsetSeconds,
  now,
}: HourlyForecastCardProps) {
  return (
    <PageCard title="24-Hour Forecast" testID="hourly-forecast-card">
      <HourlyChart
        hourly={hourly}
        utcOffsetSeconds={utcOffsetSeconds}
        now={now}
      />
    </PageCard>
  );
}
