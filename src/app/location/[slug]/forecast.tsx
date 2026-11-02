/**
 * /location/[slug]/forecast: the 24-hour and 7-day charts and the sun times
 * for a place (the web's `/[location]/forecast`). The screen only reads the
 * route's `slug`; `LocationDetailScreen` loads the place and designs every
 * state.
 */

import { useLocalSearchParams } from "expo-router";

import { LocationDetailScreen } from "@/components/weather/LocationDetail";

export default function ForecastScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <LocationDetailScreen slug={slug} sub="forecast" />;
}
