/**
 * Brand font loader. We use @expo-google-fonts/* packages so that font files
 * ship with the JS bundle and `useFonts` returns true once they're cached.
 * Family names here must match FONT_FAMILY constants in src/brand/tokens.ts.
 */

import {
  NotoSerif_400Regular,
  NotoSerif_600SemiBold,
} from "@expo-google-fonts/noto-serif";
import {
  NotoSans_400Regular,
  NotoSans_600SemiBold,
  NotoSans_700Bold,
} from "@expo-google-fonts/noto-sans";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_600SemiBold,
} from "@expo-google-fonts/jetbrains-mono";

export const BRAND_FONTS = {
  NotoSerif_400Regular,
  NotoSerif_600SemiBold,
  NotoSans_400Regular,
  NotoSans_600SemiBold,
  NotoSans_700Bold,
  JetBrainsMono_400Regular,
  JetBrainsMono_600SemiBold,
} as const;
