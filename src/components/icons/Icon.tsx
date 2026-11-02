/**
 * The weather and interface icons, drawn with react-native-svg. No emoji
 * anywhere in the app's weather screens.
 *
 * The shapes are the web's (mukoko-weather `src/lib/weather-icons.tsx`): a
 * soft fill under a bold outline for the condition icons, a plain outline for
 * the interface icons. Each icon takes one `color`; the soft fill is the same
 * colour at low opacity, so an icon reads on the sky and on a card alike.
 *
 * Icons are decorative by default (hidden from VoiceOver): the text beside one
 * always says the same thing. Pass `label` for an icon that stands alone.
 */

import { type ReactNode } from "react";
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Polygon,
  Polyline,
} from "react-native-svg";

import { weatherCodeToInfo } from "@/shared/weather";

export type IconProps = {
  size?: number;
  color: string;
  /** Names an icon that stands alone; leave empty when text sits beside it. */
  label?: string;
};

/** Soft fill opacity under the outline, as on the web. */
const FILL_CLOUD = 0.24;
const FILL_BODY = 0.26;

const CLOUD_SUN = "M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z";
const CLOUD_RAIN = "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242";
const SUN_RAYS = [
  "M12 1.75v1.5",
  "m5.9 4.4 1.05 1.05",
  "M18.1 4.4l-1.05 1.05",
  "M20.25 11.5h1.5",
  "M2.25 11.5h1.5",
];
const MOON = "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z";

type FrameProps = {
  strokeWidth: number;
  children: (color: string) => ReactNode;
};

function Frame({
  size = 24,
  color,
  label,
  strokeWidth,
  children,
}: IconProps & FrameProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={Boolean(label)}
      accessibilityLabel={label}
      accessibilityRole={label ? "image" : undefined}
      importantForAccessibility={label ? "yes" : "no-hide-descendants"}
      accessibilityElementsHidden={!label}
    >
      {children(color)}
    </Svg>
  );
}

function paths(ds: string[]): ReactNode {
  return ds.map((d) => <Path key={d} d={d} />);
}

// --- condition icons (two-tone, 2.25 stroke) -------------------------------

export function SunIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2.25}>
      {(c) => (
        <>
          <Circle cx={12} cy={12} r={4.25} fill={c} fillOpacity={FILL_BODY} />
          {paths([
            "M12 2.5v2.25",
            "M12 19.25v2.25",
            "m5.1 5.1 1.6 1.6",
            "m17.3 17.3 1.6 1.6",
            "M2.5 12h2.25",
            "M19.25 12h2.25",
            "m5.1 18.9 1.6-1.6",
            "m17.3 6.7 1.6-1.6",
          ])}
        </>
      )}
    </Frame>
  );
}

export function MoonIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2.25}>
      {(c) => (
        <>
          <Path d={MOON} fill={c} fillOpacity={FILL_BODY} />
          {paths(["M17 4.5v2.5", "M18.25 5.75h-2.5"])}
        </>
      )}
    </Frame>
  );
}

export function CloudIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2.25}>
      {(c) => (
        <Path
          d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"
          fill={c}
          fillOpacity={FILL_CLOUD}
        />
      )}
    </Frame>
  );
}

export function CloudSunIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2.25}>
      {(c) => (
        <>
          <Circle cx={12} cy={8} r={3} fill={c} fillOpacity={FILL_BODY} />
          {paths(SUN_RAYS)}
          <Path d={CLOUD_SUN} fill={c} fillOpacity={FILL_CLOUD} />
        </>
      )}
    </Frame>
  );
}

/** A crescent above a cloud: the night version of the cloud-sun icon. */
export function CloudMoonIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2.25}>
      {(c) => (
        <>
          <G transform="translate(9.2 0.6) scale(0.55)">
            <Path d={MOON} fill={c} fillOpacity={FILL_BODY} strokeWidth={4.1} />
          </G>
          <Path d={CLOUD_SUN} fill={c} fillOpacity={FILL_CLOUD} />
        </>
      )}
    </Frame>
  );
}

export function CloudRainIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2.25}>
      {(c) => (
        <>
          <Path d={CLOUD_RAIN} fill={c} fillOpacity={FILL_CLOUD} />
          {paths(["M16 15v4", "M8 15v4", "M12 17v4"])}
        </>
      )}
    </Frame>
  );
}

export function CloudDrizzleIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2.25}>
      {(c) => (
        <>
          <Path d={CLOUD_RAIN} fill={c} fillOpacity={FILL_CLOUD} />
          {paths(["M8 19v1.5", "M16 19v1.5", "M12 20.5V22"])}
        </>
      )}
    </Frame>
  );
}

export function CloudLightningIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2.25}>
      {(c) => (
        <>
          <Path
            d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"
            fill={c}
            fillOpacity={FILL_CLOUD}
          />
          <Path
            d="m13 12-3 5h4l-3 5"
            fill={c}
            fillOpacity={0.9}
            stroke="none"
          />
        </>
      )}
    </Frame>
  );
}

export function CloudFogIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2.25}>
      {(c) => (
        <>
          <Path d={CLOUD_RAIN} fill={c} fillOpacity={FILL_CLOUD} />
          {paths(["M16 17H7", "M17 21H9"])}
        </>
      )}
    </Frame>
  );
}

export function CloudSunRainIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2.25}>
      {(c) => (
        <>
          <Circle cx={12} cy={8} r={3} fill={c} fillOpacity={FILL_BODY} />
          {paths(SUN_RAYS)}
          <Path d={CLOUD_SUN} fill={c} fillOpacity={FILL_CLOUD} />
          {paths(["M8 20v2", "M11 20v2"])}
        </>
      )}
    </Frame>
  );
}

const HAIL_DOTS: [number, number][] = [
  [8, 16],
  [16, 16],
  [12, 18],
  [8, 20.5],
  [16, 20.5],
  [12, 22],
];

export function CloudHailIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2.25}>
      {(c) => (
        <>
          <Path d={CLOUD_RAIN} fill={c} fillOpacity={FILL_CLOUD} />
          {HAIL_DOTS.map(([cx, cy]) => (
            <Circle
              key={`${cx}-${cy}`}
              cx={cx}
              cy={cy}
              r={0.9}
              fill={c}
              stroke="none"
            />
          ))}
        </>
      )}
    </Frame>
  );
}

export function SnowflakeIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2.25}>
      {() => (
        <>
          <Line x1={2.5} x2={21.5} y1={12} y2={12} />
          <Line x1={12} x2={12} y1={2.5} y2={21.5} />
          <Line x1={5.5} x2={18.5} y1={5.5} y2={18.5} />
          <Line x1={18.5} x2={5.5} y1={5.5} y2={18.5} />
          {paths([
            "m9.5 3 2.5 2.5L14.5 3",
            "m9.5 21 2.5-2.5 2.5 2.5",
            "m3 9.5 2.5 2.5L3 14.5",
            "m21 9.5-2.5 2.5 2.5 2.5",
          ])}
        </>
      )}
    </Frame>
  );
}

// --- interface icons (outline, 2 stroke) ------------------------------------

export function WindIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2.25}>
      {() =>
        paths([
          "M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2",
          "M9.6 4.6A2 2 0 1 1 11 8H2",
          "M12.6 19.4A2 2 0 1 0 14 16H2",
        ])
      }
    </Frame>
  );
}

export function DropletIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2}>
      {() =>
        paths([
          "M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z",
        ])
      }
    </Frame>
  );
}

export function ThermometerIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2}>
      {() => paths(["M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"])}
    </Frame>
  );
}

export function SunriseIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2}>
      {() =>
        paths([
          "M12 2v8",
          "m4.93 10.93 1.41 1.41",
          "M2 18h2",
          "M20 18h2",
          "m19.07 10.93-1.41 1.41",
          "M22 22H2",
          "M8 6l4-4 4 4",
          "M16 18a4 4 0 0 0-8 0",
        ])
      }
    </Frame>
  );
}

export function SunsetIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2}>
      {() =>
        paths([
          "M12 10V2",
          "m4.93 10.93 1.41 1.41",
          "M2 18h2",
          "M20 18h2",
          "m19.07 10.93-1.41 1.41",
          "M22 22H2",
          "m8 2 4 4 4-4",
          "M16 18a4 4 0 0 0-8 0",
        ])
      }
    </Frame>
  );
}

export function EyeIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2}>
      {() => (
        <>
          <Path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
          <Circle cx={12} cy={12} r={3} />
        </>
      )}
    </Frame>
  );
}

export function GaugeIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2}>
      {() => paths(["m12 14 4-4", "M3.34 19a10 10 0 1 1 17.32 0"])}
    </Frame>
  );
}

export function NavigationIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2}>
      {() => <Polygon points="3 11 22 2 13 21 11 13 3 11" />}
    </Frame>
  );
}

export function HomeIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2.5}>
      {() => paths(["M3 11.5 12 4l9 7.5", "M5.5 10v10h13V10"])}
    </Frame>
  );
}

export function ShareIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2}>
      {() => (
        <>
          <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <Polyline points="16 6 12 2 8 6" />
          <Line x1={12} x2={12} y1={2} y2={15} />
        </>
      )}
    </Frame>
  );
}

export function UserIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2}>
      {() => (
        <>
          <Circle cx={12} cy={8} r={4} />
          <Path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
        </>
      )}
    </Frame>
  );
}

export function SparklesIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2}>
      {() =>
        paths([
          "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
          "M20 3v4",
          "M22 5h-4",
          "M4 17v2",
          "M5 18H3",
        ])
      }
    </Frame>
  );
}

export function SearchIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2}>
      {() => (
        <>
          <Circle cx={11} cy={11} r={8} />
          <Path d="m21 21-4.3-4.3" />
        </>
      )}
    </Frame>
  );
}

export function ChevronLeftIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2.25}>
      {() => <Path d="m15 18-6-6 6-6" />}
    </Frame>
  );
}

export function ChevronRightIcon(p: IconProps) {
  return (
    <Frame {...p} strokeWidth={2.25}>
      {() => <Path d="m9 18 6-6-6-6" />}
    </Frame>
  );
}

// --- the one icon for a WMO code --------------------------------------------

type IconComponent = (p: IconProps) => ReactNode;

const BY_NAME: Record<string, IconComponent> = {
  sun: SunIcon,
  moon: MoonIcon,
  cloud: CloudIcon,
  "cloud-sun": CloudSunIcon,
  "cloud-moon": CloudMoonIcon,
  "cloud-rain": CloudRainIcon,
  "cloud-drizzle": CloudDrizzleIcon,
  "cloud-lightning": CloudLightningIcon,
  "cloud-fog": CloudFogIcon,
  "cloud-sun-rain": CloudSunRainIcon,
  "cloud-hail": CloudHailIcon,
  snowflake: SnowflakeIcon,
};

/**
 * The night version of a condition icon (the web's `nightIcon`): sun-based
 * icons have no place after dark; everything else reads the same.
 */
export function nightIcon(icon: string): string {
  switch (icon) {
    case "sun":
      return "moon";
    case "cloud-sun":
      return "cloud-moon";
    case "cloud-sun-rain":
      return "cloud-rain";
    default:
      return icon;
  }
}

/** The icon name for a WMO code at day or night, the same choice as the web. */
export function conditionIconName(
  code: number | null | undefined,
  isDay: boolean,
): string {
  const { icon } = weatherCodeToInfo(typeof code === "number" ? code : -1);
  return isDay ? icon : nightIcon(icon);
}

/** The condition icon for a WMO code: hero, hourly tiles and daily rows. */
export function WeatherIcon({
  code,
  isDay = true,
  ...rest
}: IconProps & { code: number | null | undefined; isDay?: boolean }) {
  const Icon = BY_NAME[conditionIconName(code, isDay)] ?? CloudIcon;
  return <Icon {...rest} />;
}
