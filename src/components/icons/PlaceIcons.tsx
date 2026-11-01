/**
 * Icons for the agriculture and place cards, drawn with the same frame as the
 * rest (src/components/icons/Icon.tsx): the web's shapes
 * (`CropIcon`, `LayersIcon` in mukoko-weather `src/lib/weather-icons.tsx`),
 * one colour, decorative unless given a `label`.
 */

import { Frame, type IconProps, paths } from "./Icon";

/** A sprouting crop: the agriculture cards. */
export function CropIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2}>
      {() =>
        paths([
          "M12 22V10",
          "M12 10C12 6 8 4 8 4s0 4 4 6",
          "M12 10c0-4 4-6 4-6s0 4-4 6",
          "M12 16c-2 0-4-1.5-4-1.5S10 12 12 14",
          "M12 16c2 0 4-1.5 4-1.5S14 12 12 14",
        ])
      }
    </Frame>
  );
}

/** Stacked layers: the weather map card. */
export function LayersIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2}>
      {() =>
        paths([
          "m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z",
          "m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65",
          "m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65",
        ])
      }
    </Frame>
  );
}
