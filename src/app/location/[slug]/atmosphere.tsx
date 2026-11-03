/**
 * /location/[slug]/atmosphere: the 24-hour humidity, cloud, wind, pressure and
 * UV charts for a place (the web's `/[location]/atmosphere`). The screen only
 * reads the route's `slug`; `LocationDetailScreen` loads the place and designs
 * every state.
 */

import { useLocalSearchParams } from "expo-router";

import { LocationDetailScreen } from "@/components/weather/LocationDetail";

export default function AtmosphereScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <LocationDetailScreen slug={slug} sub="atmosphere" />;
}
