/**
 * The drawn icons for activities, community reports and the actions around
 * them (react-native-svg, the web's outline style: 24 grid, round caps, one
 * colour). No emoji.
 *
 * The web names one Lucide glyph per activity (`icon: "grill"`, `"football"`).
 * The app does not ship Lucide, so each icon name the Worker sends is drawn
 * here from a set of outline glyphs; several names share one glyph (a football
 * and a rugby ball are not the same shape, but `crop`, `shovel` and `sprout`
 * all read as a growing plant). A name the app does not know shows a plain
 * ring, never nothing and never an emoji.
 */

import { type ReactNode } from "react";
import { Circle, Path } from "react-native-svg";

import {
  CloudDrizzleIcon,
  CloudFogIcon,
  CloudHailIcon,
  CloudIcon,
  CloudLightningIcon,
  CloudRainIcon,
  DropletIcon,
  Frame,
  type IconProps,
  SnowflakeIcon,
  SunIcon,
  WindIcon,
  paths,
} from "./Icon";

type Glyph = {
  d?: string[];
  /** [cx, cy, r] */
  c?: [number, number, number][];
};

const GLYPHS: Record<string, Glyph> = {
  ring: { d: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z"] },
  leaf: {
    d: [
      "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z",
      "M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12",
    ],
  },
  sprout: {
    d: [
      "M7 20h10",
      "M10 20c5.5-2.5.8-6.4 3-10",
      "M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z",
      "M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z",
    ],
  },
  wheat: {
    d: [
      "M12 22V8",
      "M12 8c-2.2-.4-3.5-2-3.5-4.2 2.2.4 3.5 2 3.5 4.2Z",
      "M12 8c2.2-.4 3.5-2 3.5-4.2-2.2.4-3.5 2-3.5 4.2Z",
      "M12 14c-2.2-.4-3.5-2-3.5-4.2 2.2.4 3.5 2 3.5 4.2Z",
      "M12 14c2.2-.4 3.5-2 3.5-4.2-2.2.4-3.5 2-3.5 4.2Z",
      "M12 20c-2.2-.4-3.5-2-3.5-4.2 2.2.4 3.5 2 3.5 4.2Z",
      "M12 20c2.2-.4 3.5-2 3.5-4.2-2.2.4-3.5 2-3.5 4.2Z",
    ],
  },
  tree: { d: ["M12 22v-5", "M12 2 6.5 9H9l-4 6h14l-4-6h2.5Z"] },
  paw: {
    c: [
      [5, 10, 1.6],
      [9, 5.5, 1.6],
      [15, 5.5, 1.6],
      [19, 10, 1.6],
    ],
    d: [
      "M12 11c-3 0-5.5 3.2-5.5 6 0 1.8 1.4 3 3 3 1 0 1.7-.5 2.5-.5s1.5.5 2.5.5c1.6 0 3-1.2 3-3 0-2.8-2.5-6-5.5-6Z",
    ],
  },
  hive: { d: ["M12 2.5 20 7v10l-8 4.5L4 17V7Z", "M4 9.5h16", "M4 14.5h16"] },
  fish: {
    c: [[8.5, 11, 0.8]],
    d: [
      "M2.5 12c2.8-4.6 8-6 12-3.7l4 3.7-4 3.7c-4 2.3-9.2.9-12-3.7Z",
      "M18.5 12l3-3.5v7Z",
    ],
  },
  anchor: {
    c: [[12, 5, 3]],
    d: ["M12 22V8", "M5 12H2a10 10 0 0 0 20 0h-3", "M8 8h8"],
  },
  droplet: {
    d: [
      "M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z",
    ],
  },
  bolt: { d: ["M13 2 4 14h7l-1 8 9-12h-7Z"] },
  factory: { d: ["M2 20V9l6 4V9l6 4V5h4v15Z", "M2 20h20"] },
  hardhat: {
    d: [
      "M3 18h18",
      "M5 18v-2a7 7 0 0 1 14 0v2",
      "M12 9V5",
      "M9 9V7",
      "M15 9V7",
    ],
  },
  pickaxe: { d: ["M14 10 4 20", "M9 5c5-1.5 10 1 11 6-2.5-3-6-4.5-11-6Z"] },
  box: {
    d: ["M21 8 12 3 3 8v8l9 5 9-5Z", "M3.3 7.5 12 12.5l8.7-5", "M12 22V12.5"],
  },
  car: {
    c: [
      [7.5, 15, 0.9],
      [16.5, 15, 0.9],
    ],
    d: [
      "M3 17v-4l2.2-5.5A2 2 0 0 1 7 6h10a2 2 0 0 1 1.8 1.5L21 13v4Z",
      "M3 13h18",
      "M6 17v2",
      "M18 17v2",
    ],
  },
  bus: {
    c: [
      [8, 14, 0.9],
      [16, 14, 0.9],
    ],
    d: ["M4 4h16v13H4Z", "M4 11h16", "M7 17v3", "M17 17v3"],
  },
  truck: {
    c: [
      [6, 18, 2],
      [18, 18, 2],
    ],
    d: ["M2 6h12v11H2Z", "M14 10h4l4 3v4h-8Z"],
  },
  plane: {
    d: [
      "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z",
    ],
  },
  ship: {
    d: [
      "M2 20c2 1 4 1 6 0s4-1 6 0 4 1 6 0",
      "M4 17l1.5-6h13L20 17Z",
      "M12 11V4h5l-3 3",
      "M9 11V8",
    ],
  },
  ball: {
    c: [[12, 12, 10]],
    d: [
      "M12 7.5l3.8 2.8-1.4 4.4H9.6l-1.4-4.4Z",
      "M12 7.5V2",
      "M15.8 10.3l5.2-1.7",
      "M14.4 14.7l3.2 4.4",
      "M9.6 14.7l-3.2 4.4",
      "M8.2 10.3 3 8.6",
    ],
  },
  volleyball: {
    c: [[12, 12, 10]],
    d: [
      "M12 2c3 3 4 7 3 10s-3 6-8 8",
      "M2.5 10c4-2 8-1 11 1s6 5 6.5 9",
      "M21.5 14c-4 2-8 1-11-1S5 8 4.5 4",
    ],
  },
  tennis: {
    c: [[12, 12, 10]],
    d: ["M5 5c4 3 4 11 0 14", "M19 5c-4 3-4 11 0 14"],
  },
  rugby: {
    d: ["M4 20C3 12 7 4 20 4c1 8-3 16-16 16Z", "M9 15l6-6", "M10.5 10.5l3 3"],
  },
  cricket: { c: [[6, 6, 2]], d: ["M5 19 15 9", "M13 5l6 6-4 4-6-6Z"] },
  golf: { d: ["M12 18V3l7 3.5L12 10", "M8 21h8"] },
  trophy: {
    d: [
      "M8 21h8",
      "M12 17v4",
      "M7 4h10v5a5 5 0 0 1-10 0Z",
      "M7 6H4v1.5A3 3 0 0 0 7 10.5",
      "M17 6h3v1.5a3 3 0 0 1-3 3",
    ],
  },
  whistle: { c: [[8, 15, 5]], d: ["M12 13l9-5V6.5H11", "M8 10V7"] },
  running: {
    c: [[14, 4.5, 2]],
    d: ["M10 21l3-6-3-3 2-4 4 2 3 1", "M7 13l3-3", "M13 15l3 6"],
  },
  bicycle: {
    c: [
      [5.5, 17, 3.5],
      [18.5, 17, 3.5],
      [15, 5, 1],
    ],
    d: ["M5.5 17 9 8h6l3.5 9", "M9 8l3 9h6.5", "M9 5.5h3"],
  },
  swimming: {
    c: [[16, 6, 2]],
    d: [
      "M2 17c2 1.2 3.5 1.2 5.5 0s3.5-1.2 5.5 0 3.5 1.2 5.5 0 2.5-.6 3.5-.8",
      "M5 13l5-4 4 2.5",
      "M10 9l3-1",
    ],
  },
  camera: { c: [[12, 13.5, 3.5]], d: ["M3 8h4l1.5-3h7L17 8h4v12H3Z"] },
  binoculars: {
    c: [
      [6.5, 16, 3.5],
      [17.5, 16, 3.5],
    ],
    d: ["M10 16V6h4v10", "M3 16V9l3-4", "M21 16V9l-3-4"],
  },
  bird: {
    d: [
      "M16 7h.01",
      "M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20",
      "m20 7 2 .5-2 .5",
      "M10 18v3",
      "M14 17.75V21",
      "M7 18a6 6 0 0 0 3.84-10.61",
    ],
  },
  tent: {
    d: ["M3.5 21 14 3", "M20.5 21 10 3", "M15.5 21 12 15l-3.5 6", "M2 21h20"],
  },
  mountain: { d: ["m8 3 4 8 5-5 5 15H2Z"] },
  star: {
    d: ["m12 2.5 3 6.2 6.8 1-5 4.8 1.2 6.8L12 18l-6 3.3 1.2-6.8-5-4.8 6.8-1Z"],
  },
  shield: { d: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"] },
  footprints: {
    d: [
      "M8 4c2 0 3 2 3 5 0 2-1 3-3 3S5 11 5 9s1-5 3-5Z",
      "M16 12c2 0 3 2 3 5 0 2-1 3-3 3s-3-1-3-3 1-5 3-5Z",
    ],
  },
  church: {
    d: ["M12 2v5", "M10 4.5h4", "M12 7 5 11v10h14V11Z", "M10 21v-5h4v5"],
  },
  store: {
    d: [
      "M3 9l1.5-5h15L21 9",
      "M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0",
      "M5 12v9h14v-9",
      "M10 21v-5h4v5",
    ],
  },
  music: {
    c: [
      [6, 18, 3],
      [18, 16, 3],
    ],
    d: ["M9 18V5l12-2v13"],
  },
  calendar: { d: ["M4 5h16v16H4Z", "M16 3v4", "M8 3v4", "M4 10h16"] },
  pot: {
    d: [
      "M3 11h18v5a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5Z",
      "M6 11V8",
      "M12 11V6",
      "M18 11V8",
    ],
  },
  grill: {
    d: [
      "M3 10h18a9 9 0 0 1-18 0Z",
      "M8 19l-2 3",
      "M16 19l2 3",
      "M8 6c0-1 1-1.5 1-3",
      "M13 6c0-1 1-1.5 1-3",
    ],
  },
  picnic: {
    d: ["M4 10h16l-1.5 11h-13Z", "M8 10a4 4 0 0 1 8 0", "M10 14v4", "M14 14v4"],
  },
  graduation: {
    d: ["M22 10 12 5 2 10l10 5Z", "M6 12v5c3 2.5 9 2.5 12 0v-5", "M22 10v6"],
  },
  heartpulse: {
    d: [
      "M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z",
      "M3.2 12h4l1.5-2.5 3 5 2-3.5h6",
    ],
  },
  drone: {
    c: [
      [5, 6, 2.5],
      [19, 6, 2.5],
      [5, 18, 2.5],
      [19, 18, 2.5],
    ],
    d: ["M7 8l3 3", "M17 8l-3 3", "M7 16l3-3", "M17 16l-3-3", "M10 10h4v4h-4Z"],
  },
  sparkles: {
    d: [
      "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
      "M20 3v4",
      "M22 5h-4",
      "M4 17v2",
      "M5 18H3",
    ],
  },
};

/** The Worker's icon names -> the glyph that draws them. */
const BY_NAME: Record<string, string> = {
  anchor: "anchor",
  bee: "hive",
  bicycle: "bicycle",
  binoculars: "binoculars",
  bird: "bird",
  bolt: "bolt",
  box: "box",
  bus: "bus",
  calendar: "calendar",
  camera: "camera",
  car: "car",
  church: "church",
  "cooking-pot": "pot",
  cricket: "cricket",
  crop: "sprout",
  drone: "drone",
  factory: "factory",
  fish: "fish",
  "flower-2": "leaf",
  football: "ball",
  footprints: "footprints",
  golf: "golf",
  graduationcap: "graduation",
  grill: "grill",
  hardhat: "hardhat",
  heartpulse: "heartpulse",
  horse: "paw",
  leaf: "leaf",
  livestock: "paw",
  mountain: "mountain",
  music: "music",
  pawprint: "paw",
  pickaxe: "pickaxe",
  picnic: "picnic",
  plane: "plane",
  rugby: "rugby",
  running: "running",
  shield: "shield",
  ship: "ship",
  shovel: "sprout",
  sparkles: "sparkles",
  sprout: "sprout",
  star: "star",
  store: "store",
  swimming: "swimming",
  tennis: "tennis",
  tent: "tent",
  tree: "tree",
  trophy: "trophy",
  truck: "truck",
  volleyball: "volleyball",
  water: "droplet",
  wheat: "wheat",
  whistle: "whistle",
};

/** The glyph name for a Worker icon name; the plain ring when unknown. */
export function glyphFor(icon: string | undefined): string {
  return (icon && BY_NAME[icon]) || "ring";
}

export type ActivityIconProps = IconProps & {
  /** The Worker's `icon` name for the activity (`grill`, `football`, ...). */
  icon?: string;
};

export function ActivityIcon({ icon, ...p }: ActivityIconProps) {
  const glyph = GLYPHS[glyphFor(icon)];
  return (
    <Frame {...p} strokeWidth={2}>
      {() => (
        <>
          {paths(glyph.d ?? [])}
          {(glyph.c ?? []).map(([cx, cy, r]) => (
            <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
          ))}
        </>
      )}
    </Frame>
  );
}

// --- community reports -------------------------------------------------------

type IconComponent = (p: IconProps) => ReactNode;

/** Report type id -> its drawn condition icon (the web's `report-types` map). */
const REPORT_ICON: Record<string, IconComponent> = {
  "light-rain": CloudDrizzleIcon,
  "heavy-rain": CloudRainIcon,
  thunderstorm: CloudLightningIcon,
  hail: CloudHailIcon,
  flooding: DropletIcon,
  "strong-wind": WindIcon,
  "clear-skies": SunIcon,
  cloudy: CloudIcon,
  fog: CloudFogIcon,
  mist: CloudFogIcon,
  haze: CloudFogIcon,
  dust: CloudIcon,
  frost: SnowflakeIcon,
};

export function ReportTypeIcon({ type, ...p }: IconProps & { type: string }) {
  const Icon = REPORT_ICON[type] ?? CloudIcon;
  return <>{Icon(p)}</>;
}

// --- actions -----------------------------------------------------------------

export function MegaphoneIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2}>
      {() => paths(["m3 11 18-8v18L3 13Z", "M11.6 16.8a3 3 0 1 1-5.8-1.6"])}
    </Frame>
  );
}

export function CheckIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={3}>
      {() => <Path d="M20 6 9 17l-5-5" />}
    </Frame>
  );
}

export function ArrowUpIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2}>
      {() => paths(["m5 12 7-7 7 7", "M12 19V5"])}
    </Frame>
  );
}

export function ChevronDownIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2.25}>
      {() => <Path d="m6 9 6 6 6-6" />}
    </Frame>
  );
}

export function ChevronUpIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2.25}>
      {() => <Path d="m18 15-6-6-6 6" />}
    </Frame>
  );
}
