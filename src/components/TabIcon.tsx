/**
 * Tab bar icon: a drawn icon (react-native-svg) in the active or inactive
 * tint. The tab's label ("Weather", "Explore", ...) is its accessible name, so
 * the icon is decorative.
 */

import { type ColorValue } from "react-native";

import {
  CloudSunIcon,
  SearchIcon,
  SparklesIcon,
  UserIcon,
} from "@/components/icons/Icon";

export type TabIconName = "weather" | "explore" | "shamwari" | "my";

const ICONS = {
  weather: CloudSunIcon,
  explore: SearchIcon,
  shamwari: SparklesIcon,
  my: UserIcon,
} as const;

export type TabIconProps = {
  name: TabIconName;
  /** Accepts any RN ColorValue: react-navigation passes one. */
  color: ColorValue;
  size?: number;
  focused?: boolean;
};

export function TabIcon({ name, color, size = 24 }: TabIconProps) {
  const Icon = ICONS[name];
  return <Icon size={size} color={String(color)} />;
}
