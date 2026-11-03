import { type FarmColors, farmColorsFor } from "@/theme/farm";

import { usePageColors } from "./usePageColors";

/** The agriculture and place card colours for the OS colour scheme. */
export function useFarmColors(): FarmColors {
  return farmColorsFor(usePageColors().scheme);
}
