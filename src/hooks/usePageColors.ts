import { useColorScheme } from "react-native";

import { type PageColors, pageColorsFor } from "@/theme/mzizi";

/** The page colours (web tokens) for the OS colour scheme, and the scheme. */
export function usePageColors(): {
  colors: PageColors;
  dark: boolean;
  scheme: "light" | "dark";
} {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  return { colors: pageColorsFor(scheme), dark: scheme === "dark", scheme };
}
