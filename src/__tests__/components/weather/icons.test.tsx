/**
 * Icons: every weather icon is drawn (react-native-svg), chosen by the web's
 * mapping from the WMO code and the hour, and no emoji or pictograph anywhere
 * in the weather screens' source.
 */

import { render } from "@testing-library/react-native";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  CloudSunIcon,
  SunIcon,
  WeatherIcon,
  conditionIconName,
  nightIcon,
} from "@/components/icons/Icon";
import { weatherCodeToInfo } from "@/shared/weather";

import { HAS_EMOJI } from "@/test-utils/weather-fixtures";

const WMO_CODES = [
  0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77,
  80, 81, 82, 85, 86, 95, 96, 99,
];

describe("conditionIconName", () => {
  it("is the web's icon for every WMO code by day", () => {
    for (const code of WMO_CODES) {
      expect(conditionIconName(code, true)).toBe(weatherCodeToInfo(code).icon);
    }
  });

  it("swaps the sun icons for the night, and only those (the web's nightIcon)", () => {
    expect(nightIcon("sun")).toBe("moon");
    expect(nightIcon("cloud-sun")).toBe("cloud-moon");
    expect(nightIcon("cloud-sun-rain")).toBe("cloud-rain");
    expect(nightIcon("cloud-lightning")).toBe("cloud-lightning");
    expect(conditionIconName(0, false)).toBe("moon");
    expect(conditionIconName(2, false)).toBe("cloud-moon");
    expect(conditionIconName(80, false)).toBe("cloud-rain");
    expect(conditionIconName(95, false)).toBe("cloud-lightning");
  });

  it("falls back to a cloud for an unknown or missing code", () => {
    expect(conditionIconName(null, true)).toBe("cloud");
    expect(conditionIconName(undefined, true)).toBe("cloud");
    expect(conditionIconName(1234, true)).toBe("cloud");
  });
});

describe("WeatherIcon", () => {
  it("renders an SVG for every code at day and at night", async () => {
    for (const code of WMO_CODES) {
      for (const isDay of [true, false]) {
        const tree = await render(
          <WeatherIcon code={code} isDay={isDay} size={20} color="#ffffff" />,
        );
        const json = JSON.stringify(tree.toJSON());
        expect(json).toContain("RNSVGSvgView");
        expect(HAS_EMOJI.test(json)).toBe(false);
      }
    }
  });

  it("is decorative unless it carries a label", async () => {
    const hidden = await render(<SunIcon color="#fff" />);
    expect(JSON.stringify(hidden.toJSON())).toContain(
      '"importantForAccessibility":"no-hide-descendants"',
    );
    const named = await render(
      <CloudSunIcon color="#fff" label="Partly cloudy" />,
    );
    expect(named.getByLabelText("Partly cloudy")).toBeTruthy();
  });
});

describe("no emoji in the weather screens", () => {
  const root = join(__dirname, "..", "..", "..");
  const files = [
    ...readdirSync(join(root, "components", "weather"))
      .filter((f) => /\.tsx?$/.test(f))
      .map((f) => join(root, "components", "weather", f)),
    join(root, "components", "icons", "Icon.tsx"),
    join(root, "components", "TabIcon.tsx"),
    join(root, "app", "(tabs)", "index.tsx"),
    join(root, "app", "location", "[slug].tsx"),
  ];

  it.each(files.map((f) => [f.replace(root, "src")]))(
    "%s holds no emoji or pictograph",
    (rel) => {
      const file = join(root, rel.replace(/^src\//, ""));
      const text = readFileSync(file, "utf8");
      expect(text.match(HAS_EMOJI)).toBeNull();
      // Unicode weather glyphs that render as emoji are text-level emoji too.
      expect(text).not.toMatch(/[☀-➿]/);
    },
  );
});
