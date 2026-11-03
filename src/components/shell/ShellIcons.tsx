/**
 * The shell's interface icons (Lucide's shapes, as the web's bottom bar and
 * menus use): Map, List, More, Compass, Settings, Plus, Close. Plain outline,
 * one colour, decorative unless `label` is given, as src/components/icons.
 */

import { type ReactNode } from "react";
import Svg, { Circle, Line, Path, Polygon } from "react-native-svg";

export type ShellIconProps = { size?: number; color: string; label?: string };

function Frame({
  size = 24,
  color,
  label,
  children,
}: ShellIconProps & { children: ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={Boolean(label)}
      accessibilityLabel={label}
      accessibilityRole={label ? "image" : undefined}
      importantForAccessibility={label ? "yes" : "no-hide-descendants"}
      accessibilityElementsHidden={!label}
    >
      {children}
    </Svg>
  );
}

export function MapIcon(p: ShellIconProps) {
  return (
    <Frame {...p}>
      <Path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
      <Path d="M15 5.764v15" />
      <Path d="M9 3.236v15" />
    </Frame>
  );
}

export function ListIcon(p: ShellIconProps) {
  return (
    <Frame {...p}>
      <Path d="M3 12h.01" />
      <Path d="M3 18h.01" />
      <Path d="M3 6h.01" />
      <Path d="M8 12h13" />
      <Path d="M8 18h13" />
      <Path d="M8 6h13" />
    </Frame>
  );
}

export function MoreIcon(p: ShellIconProps) {
  return (
    <Frame {...p}>
      <Circle cx={12} cy={12} r={1} />
      <Circle cx={19} cy={12} r={1} />
      <Circle cx={5} cy={12} r={1} />
    </Frame>
  );
}

export function CompassIcon(p: ShellIconProps) {
  return (
    <Frame {...p}>
      <Circle cx={12} cy={12} r={10} />
      <Polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </Frame>
  );
}

export function SettingsIcon(p: ShellIconProps) {
  return (
    <Frame {...p}>
      <Path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <Circle cx={12} cy={12} r={3} />
    </Frame>
  );
}

export function PlusIcon(p: ShellIconProps) {
  return (
    <Frame {...p}>
      <Line x1={12} x2={12} y1={5} y2={19} />
      <Line x1={5} x2={19} y1={12} y2={12} />
    </Frame>
  );
}

export function CloseIcon(p: ShellIconProps) {
  return (
    <Frame {...p}>
      <Path d="M18 6 6 18" />
      <Path d="m6 6 12 12" />
    </Frame>
  );
}
