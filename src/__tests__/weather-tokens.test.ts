/**
 * Guards for the weather screens' look: no spacing, size, colour or weight is
 * typed into a screen or a weather component. Every one comes from the Mzizi
 * tokens (src/theme/mzizi.ts, src/theme/sky.ts), the web's own values, so the
 * mobile page cannot drift from the web page one hard-coded number at a time.
 * The page gutter is one place (WeatherScroll), not a number in each screen.
 *
 * Each rule is also shown to fail on a deliberate violation (the last block),
 * so a guard that silently stops matching is caught too.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");

function weatherFiles(): string[] {
  const dir = join(root, "components", "weather");
  const components = readdirSync(dir)
    .filter((f) => /\.tsx?$/.test(f))
    .map((f) => join(dir, f));
  return [
    ...components,
    join(root, "app", "(tabs)", "index.tsx"),
    join(root, "app", "location", "[slug].tsx"),
  ];
}

/** [rule, pattern matched against each line]. */
export const RULES: [string, RegExp][] = [
  [
    "a hard-coded padding or margin (use SPACE)",
    /\b(padding|margin)(Top|Bottom|Left|Right|Horizontal|Vertical|Start|End)?\s*:\s*-?[1-9]/,
  ],
  ["a hard-coded gap (use SPACE)", /\b(gap|rowGap|columnGap)\s*:\s*[1-9]/],
  [
    "a hard-coded font size or line height (use TYPE)",
    /\b(fontSize|lineHeight)\s*:\s*\d/,
  ],
  [
    "a font weight (the type scale sets weights 400, 600, 700)",
    /\bfontWeight\b/,
  ],
  [
    "a thin or light font (weights are 400, 600, 700 only)",
    /(ExtraLight|Thin|_200|_300|Light\b)/,
  ],
  [
    "a weight other than 400, 600 or 700",
    /\bweight=\{(?!400\}|600\}|700\})\d+\}/,
  ],
  ["a hex colour (use the colour tokens)", /#[0-9a-fA-F]{3,8}\b/],
  [
    "a shadow or elevation (Mzizi separates with borders)",
    /\b(shadow\w*|elevation)\s*:/,
  ],
  ["a hard-coded radius (use RADIUS)", /\bborderRadius\s*:\s*\d/],
];

function violations(files: string[], rules = RULES): string[] {
  const found: string[] = [];
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      // Comments may describe the rule.
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      for (const [what, pattern] of rules) {
        if (pattern.test(line)) {
          found.push(
            `${file.replace(root, "src")}:${i + 1}: ${what}: ${line.trim()}`,
          );
        }
      }
    });
  }
  return found;
}

describe("the weather screens and components use tokens, not numbers", () => {
  it("has the files it is meant to guard", () => {
    const names = weatherFiles().map((f) => f.replace(root, "src"));
    expect(names).toEqual(
      expect.arrayContaining([
        "src/components/weather/WeatherScroll.tsx",
        "src/components/weather/SkyHero.tsx",
        "src/components/weather/ConditionsCard.tsx",
        "src/components/weather/ConditionTiles.tsx",
        "src/components/weather/WeatherSkeleton.tsx",
        "src/app/(tabs)/index.tsx",
        "src/app/location/[slug].tsx",
      ]),
    );
  });

  it("has no hard-coded spacing, size, colour, weight, shadow or radius", () => {
    expect(violations(weatherFiles())).toEqual([]);
  });

  it("applies the page gutter and safe-area insets in ONE place: WeatherScroll", () => {
    const scroll = readFileSync(
      join(root, "components", "weather", "WeatherScroll.tsx"),
      "utf8",
    );
    expect(scroll).toContain("SPACE.gutter");
    expect(scroll).toContain("useSafeAreaInsets");
    for (const screen of [
      join(root, "app", "(tabs)", "index.tsx"),
      join(root, "app", "location", "[slug].tsx"),
    ]) {
      const text = readFileSync(screen, "utf8");
      expect(text).not.toMatch(/\bSafeAreaView\b/);
      expect(text).not.toMatch(/\bpadding\w*\s*:/);
      expect(text).not.toMatch(/\bScrollView\b/);
    }
  });

  it("builds both screens from the same WeatherPage", () => {
    for (const screen of [
      join(root, "app", "(tabs)", "index.tsx"),
      join(root, "app", "location", "[slug].tsx"),
    ]) {
      const text = readFileSync(screen, "utf8");
      expect(text).toContain("WeatherPage");
      expect(text).toContain("WeatherSkeleton");
      expect(text).toContain("WeatherError");
    }
  });
});

describe("each guard fails on a deliberate violation", () => {
  const bad: [string, string][] = [
    ["padding", "style={{ paddingHorizontal: 20 }}"],
    ["margin", "marginTop: 12,"],
    ["gap", "gap: 8,"],
    ["font size", "fontSize: 17,"],
    ["font weight", 'fontWeight: "200",'],
    ["a thin font", 'fontFamily: "NotoSans_200ExtraLight"'],
    ["weight prop", "<WxText weight={200}>x</WxText>"],
    ["hex colour", 'color: "#ff0000",'],
    ["shadow", "shadowOpacity: 0.1,"],
    ["radius", "borderRadius: 16,"],
  ];

  it.each(bad)("catches %s", (_name, line) => {
    const matched = RULES.filter(([, pattern]) => pattern.test(line));
    expect(matched.length).toBeGreaterThan(0);
  });

  it("allows tokens and zero", () => {
    for (const line of [
      "padding: SPACE.card,",
      "paddingHorizontal: SPACE.gutter,",
      "marginTop: 0,",
      "gap: SPACE.stack,",
      "fontFamily: FONT_FILE[family][weight],",
      "<WxText weight={600}>x</WxText>",
      "borderRadius: RADIUS.card,",
    ]) {
      expect(RULES.filter(([, pattern]) => pattern.test(line))).toEqual([]);
    }
  });
});
