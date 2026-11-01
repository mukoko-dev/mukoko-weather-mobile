/**
 * Bottom tabs sanity — the layout exports a default React component that
 * registers four screens (Weather, Explore, Shamwari, My) via expo-router's
 * `<Tabs>`. We can't easily snapshot the full navigator without a real
 * NavigationContainer, so we verify the tab icons are drawn (not text glyphs)
 * in the given colour and that the layout module exposes a default export.
 *
 * @testing-library/react-native v14 returns a Promise from `render()`.
 */

import { render } from "@testing-library/react-native";

import TabsLayout from "@/app/(tabs)/_layout";
import { TabIcon } from "@/components/TabIcon";

describe("TabIcon", () => {
  it.each(["weather", "explore", "shamwari", "my"] as const)(
    "draws the %s icon as an SVG, in the given colour, with no glyph text",
    async (name) => {
      const tree = await render(<TabIcon name={name} color="#0047AB" />);
      const json = JSON.stringify(tree.toJSON());
      expect(json).toContain("RNSVGSvgView");
      expect(json).toContain("#0047AB");
      // No text glyph, and so no emoji, in the tab bar.
      expect(json).not.toContain('"type":"Text"');
      expect(json).not.toMatch(/\p{Extended_Pictographic}/u);
    },
  );

  it("is hidden from VoiceOver: the tab's label is its name", async () => {
    const tree = await render(<TabIcon name="weather" color="#000" />);
    expect(JSON.stringify(tree.toJSON())).toContain(
      '"importantForAccessibility":"no-hide-descendants"',
    );
  });
});

describe("bottom tabs layout", () => {
  it("exports a default React component (the Tabs navigator)", () => {
    expect(typeof TabsLayout).toBe("function");
  });
});
