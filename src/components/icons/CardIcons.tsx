/**
 * Icons the cards below the tiles add to the weather set (the haze panel's
 * smog glyph, the alert banners' triangle), drawn like the rest in
 * src/components/icons/Icon.tsx from the web's shapes. Decorative by default.
 */

import { Path } from "react-native-svg";

import { Frame, type IconProps, paths } from "./Icon";

/** The web's `FactoryIcon` (urban smog). */
export function FactoryIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2.25}>
      {(c) => (
        <Path
          d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"
          fill={c}
          fillOpacity={0.24}
        />
      )}
    </Frame>
  );
}

/** An alert triangle (Lucide `TriangleAlert`): for a notice, not an error. */
export function TriangleAlertIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2.25}>
      {(c) => (
        <>
          <Path
            d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"
            fill={c}
            fillOpacity={0.24}
          />
          {paths(["M12 9v4", "M12 17h.01"])}
        </>
      )}
    </Frame>
  );
}

/** A chevron pointing right: a row that opens something. */
export function ChevronRightIcon(p: IconProps) {
  return <Frame {...p} strokeWidth={2.25}>{() => <Path d="m9 18 6-6-6-6" />}</Frame>;
}
