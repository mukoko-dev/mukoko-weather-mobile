/**
 * Brand font loader. We use @expo-google-fonts/* packages so that font files
 * ship with the JS bundle and `useFonts` returns true once they're cached.
 * Family names here must match FONT_FAMILY constants in src/brand/tokens.ts.
 */

import {
  NotoSerif_400Regular,
  NotoSerif_600SemiBold,
} from '@expo-google-fonts/noto-serif';
import {
  NotoSans_400Regular,
  NotoSans_600SemiBold,
} from '@expo-google-fonts/noto-sans';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';

export const BRAND_FONTS = {
  NotoSerif_400Regular,
  NotoSerif_600SemiBold,
  NotoSans_400Regular,
  NotoSans_600SemiBold,
  JetBrainsMono_400Regular,
} as const;
