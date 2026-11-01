/**
 * The open-sky hero: the web's rows, sizes and order, readable at 320 pt and
 * at the largest text size, with no emoji and no card.
 */

import { render } from "@testing-library/react-native";

import { SkyHero } from "@/components/weather/SkyHero";
import { lineHeightOf, TOUCH, TYPE } from "@/theme/mzizi";

import { PHONE_WIDTHS, setInsets, setWindow } from "@/test-utils/mocks";
import {
  HARARE_OFFSET,
  HAS_EMOJI,
  NOW,
  allText,
} from "@/test-utils/weather-fixtures";

jest.mock("expo-router", () => require("@/test-utils/mocks").routerMock());
jest.mock("react-native-safe-area-context", () =>
  require("@/test-utils/mocks").safeAreaMock(),
);

const props = {
  name: "Harare",
  temperature: 27.6,
  weatherCode: 3,
  isDay: true,
  high: 32.2,
  low: 19.8,
  utcOffsetSeconds: HARARE_OFFSET,
  now: NOW,
  onShare: jest.fn(),
  onSettings: jest.fn(),
};

function styleOf(node: {
  props: { style?: unknown };
}): Record<string, unknown> {
  const s = node.props.style;
  return Array.isArray(s)
    ? s.flat(3).reduce((a: object, b: object) => ({ ...a, ...b }), {})
    : ((s ?? {}) as Record<string, unknown>);
}

describe("SkyHero", () => {
  it("says the place, the rounded temperature, the condition and H/L as the web does", async () => {
    const { getByText } = await render(<SkyHero {...props} />);
    expect(getByText("Harare")).toBeTruthy();
    expect(getByText("28°")).toBeTruthy();
    expect(getByText("Overcast")).toBeTruthy();
    expect(getByText("H:32°")).toBeTruthy();
    expect(getByText("L:20°")).toBeTruthy();
  });

  it("names the temperature for VoiceOver, not just the symbol", async () => {
    const { getByLabelText } = await render(<SkyHero {...props} />);
    expect(getByLabelText("28 degrees Celsius")).toBeTruthy();
  });

  it("reads the eyebrow clock in the PLACE's time, not the phone's", async () => {
    const { getByText } = await render(<SkyHero {...props} />);
    // 00:45 UTC is 02:45 in Harare (UTC+2).
    expect(getByText("02:45 LOCAL")).toBeTruthy();
  });

  it("shows MY LOCATION, then HOME, instead of the clock", async () => {
    const mine = await render(<SkyHero {...props} isCurrentLocation />);
    expect(mine.getByText("My Location")).toBeTruthy();
    expect(mine.queryByText("02:45 LOCAL")).toBeNull();
    const both = await render(<SkyHero {...props} isCurrentLocation isHome />);
    expect(both.getByText("Home")).toBeTruthy();
  });

  it("is a centred stack on the Mzizi type scale: sizes, leading and weights", async () => {
    const { getByText } = await render(
      <SkyHero {...props} isCurrentLocation />,
    );
    const name = styleOf(getByText("Harare"));
    expect(name.fontSize).toBe(TYPE.h2.size);
    expect(name.lineHeight).toBe(lineHeightOf("h2"));
    expect(name.fontFamily).toBe("NotoSerif_600SemiBold");
    expect(name.textAlign).toBe("center");
    const numeral = styleOf(getByText("28°"));
    expect(numeral.fontSize).toBe(TYPE.display.size);
    expect(numeral.lineHeight).toBe(lineHeightOf("display"));
    expect(numeral.fontFamily).toBe("NotoSans_400Regular");
    const condition = styleOf(getByText("Overcast"));
    expect(condition.fontSize).toBe(TYPE.h5.size);
    expect(condition.fontFamily).toBe("NotoSans_400Regular");
    const hl = styleOf(getByText("H:32°"));
    expect(hl.fontSize).toBe(TYPE.bodyLg.size);
    expect(hl.fontFamily).toBe("NotoSans_600SemiBold");
    const eyebrow = styleOf(getByText("My Location"));
    expect(eyebrow.fontSize).toBe(TYPE.caption.size);
    expect(eyebrow.fontFamily).toBe("JetBrainsMono_600SemiBold");
    expect(eyebrow.textTransform).toBe("uppercase");
  });

  it("never truncates the name, and fits the numeral to the line instead", async () => {
    const { getByText } = await render(
      <SkyHero {...props} name="Singapore American School" temperature={-12} />,
    );
    const name = getByText("Singapore American School");
    expect(name.props.numberOfLines).toBeUndefined();
    const numeral = getByText("-12°");
    expect(numeral.props.numberOfLines).toBe(1);
    expect(numeral.props.adjustsFontSizeToFit).toBe(true);
  });

  it("has two 48 dp round controls with spoken names, and they act", async () => {
    const onShare = jest.fn();
    const onSettings = jest.fn();
    const { getByRole } = await render(
      <SkyHero {...props} onShare={onShare} onSettings={onSettings} />,
    );
    const share = getByRole("button", { name: "Share weather for Harare" });
    const settings = getByRole("button", { name: "Settings and sign in" });
    for (const control of [share, settings]) {
      const s = styleOf(control);
      expect(s.width).toBe(TOUCH.min);
      expect(s.height).toBe(TOUCH.min);
      expect(s.borderRadius).toBeGreaterThanOrEqual(TOUCH.min / 2);
    }
    const { fireEvent } = jest.requireActual("@testing-library/react-native");
    await fireEvent.press(share);
    await fireEvent.press(settings);
    expect(onShare).toHaveBeenCalledTimes(1);
    expect(onSettings).toHaveBeenCalledTimes(1);
  });

  it("draws no emoji and no card: just text and drawn icons on the sky", async () => {
    const tree = await render(
      <SkyHero
        {...props}
        isCurrentLocation
        isHome
        breadcrumb="Zimbabwe / Harare"
      />,
    );
    expect(HAS_EMOJI.test(allText(tree.toJSON()))).toBe(false);
  });

  it("leaves a dash, never NaN, when the temperature or H/L are missing", async () => {
    const { getByText, queryByText } = await render(
      <SkyHero {...props} temperature={null} high={null} low={undefined} />,
    );
    expect(getByText("—")).toBeTruthy();
    expect(queryByText(/NaN/)).toBeNull();
    expect(queryByText(/^H:/)).toBeNull();
  });

  it.each(PHONE_WIDTHS)(
    "renders at %i pt and at the largest text size (fontScale 2) without a fixed width",
    async (width) => {
      setInsets({ top: 47, bottom: 34, left: 0, right: 0 });
      setWindow(width, 852, 2);
      const { getByText, toJSON } = await render(
        <SkyHero {...props} breadcrumb="Zimbabwe / Mashonaland East" />,
      );
      expect(getByText("28°")).toBeTruthy();
      // No text is clipped to a line count except the numeral, and the trail wraps.
      expect(
        getByText("Zimbabwe / Mashonaland East").props.numberOfLines,
      ).toBeUndefined();
      const json = JSON.stringify(toJSON());
      expect(json).not.toMatch(/"width":\s*(3[2-9]\d|4\d\d)/); // nothing as wide as a phone
    },
  );
});
