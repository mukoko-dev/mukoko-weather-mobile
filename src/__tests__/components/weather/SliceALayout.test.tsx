/**
 * Layout and accessibility of the cards this slice adds, on the phone widths
 * the owner named (320, 375, 393, 430 pt), at normal and the largest text:
 * no card sets a side margin (the page gutter is applied once, by
 * WeatherScroll), every control is 48 dp or taller, every card is one item to
 * VoiceOver or has a named header, and nothing draws an emoji.
 */

import { render, waitFor } from "@testing-library/react-native";

import { SINGLE_COLUMN_FONT_SCALE } from "@/components/weather/InsightCard";
import { WeatherPage } from "@/components/weather/WeatherPage";
import { routeFetch } from "@/api/mock-routes";
import airQualityHarare from "@/api/__fixtures__/air-quality-harare.json";
import hazeHarare from "@/api/__fixtures__/haze-harare.json";
import normalsMonthlyHarare from "@/api/__fixtures__/normals-monthly-harare.json";
import normalsTodayHarare from "@/api/__fixtures__/normals-today-harare.json";
import { TOUCH } from "@/theme/mzizi";
import {
  IPHONE_INSETS,
  PHONE_WIDTHS,
  setInsets,
  setWindow,
} from "@/test-utils/mocks";
import {
  HAS_EMOJI,
  allText,
  harareWeather,
} from "@/test-utils/weather-fixtures";

jest.mock("expo-router", () => require("@/test-utils/mocks").routerMock());
jest.mock("expo-status-bar", () =>
  require("@/test-utils/mocks").statusBarMock(),
);
jest.mock("react-native-safe-area-context", () =>
  require("@/test-utils/mocks").safeAreaMock(),
);

const ROUTES = {
  "/v1/air-quality": { body: airQualityHarare },
  "/v1/haze": { body: hazeHarare },
  "/v1/normals": { body: normalsTodayHarare },
  "/v1/normals/monthly": { body: normalsMonthlyHarare },
};

type Node = {
  type?: string;
  props?: Record<string, unknown>;
  children?: (Node | string)[] | null;
};

function walk(node: unknown, visit: (n: Node) => void) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) return node.forEach((n) => walk(n, visit));
  const n = node as Node;
  visit(n);
  (n.children ?? []).forEach((c) => walk(c, visit));
}

function flat(style: unknown): Record<string, unknown> {
  return Array.isArray(style)
    ? style.flat(3).reduce((a: object, b: object) => ({ ...a, ...b }), {})
    : ((style ?? {}) as Record<string, unknown>);
}

beforeEach(() => {
  setInsets(IPHONE_INSETS);
  jest.clearAllMocks();
});

describe.each([1, SINGLE_COLUMN_FONT_SCALE + 0.65])(
  "the whole page at text size %f",
  (fontScale) => {
    it.each(PHONE_WIDTHS)(
      "at %i pt: the new cards set no side margin, controls are 48 dp+, no emoji",
      async (width) => {
        setWindow(width, 852, fontScale);
        routeFetch(ROUTES);
        const tree = await render(
          <WeatherPage weather={harareWeather()} name="Harare" inTabs />,
        );
        await waitFor(() =>
          expect(tree.getByLabelText(/^Air quality\./)).toBeTruthy(),
        );
        await waitFor(() =>
          expect(tree.getByLabelText(/^Averages\./)).toBeTruthy(),
        );

        const json = tree.toJSON();
        // The cards this slice adds (the hour strip and the week, from the
        // first slice, are not under test here).
        const mine = (n: Node) => {
          const id = n.props?.testID;
          const label = String(n.props?.accessibilityLabel ?? "");
          return (
            id === "haze-card" ||
            id === "minutely-card" ||
            id === "model-comparison-card" ||
            /^(Air quality|Moon|Averages)\./.test(label)
          );
        };
        const margins: string[] = [];
        const small: string[] = [];
        let cards = 0;
        walk(json, (root) => {
          if (!mine(root)) return;
          cards += 1;
          walk(root, (n) => {
            const style = flat(n.props?.style);
            for (const key of [
              "marginLeft",
              "marginRight",
              "marginHorizontal",
              "marginStart",
              "marginEnd",
            ]) {
              if (typeof style[key] === "number" && style[key] !== 0) {
                margins.push(`${key}=${style[key]}`);
              }
            }
            // Every plain control is at least 48 dp high (a tile that opens a
            // sheet is far taller).
            if (
              n.props?.accessibilityRole === "button" &&
              n.props?.accessibilityHint !== "Opens details"
            ) {
              const h = style.minHeight ?? style.height;
              if (typeof h === "number" && h < TOUCH.min) {
                small.push(String(n.props?.accessibilityLabel));
              }
            }
          });
        });
        expect(cards).toBeGreaterThanOrEqual(5);
        expect(margins).toEqual([]);
        expect(small).toEqual([]);
        expect(HAS_EMOJI.test(allText(json))).toBe(false);
      },
    );
  },
);

describe("VoiceOver", () => {
  beforeEach(() => setWindow(393, 852));

  it("reads the new tiles as one labelled button each, with the tile's sentence", async () => {
    routeFetch(ROUTES);
    const tree = await render(
      <WeatherPage weather={harareWeather()} name="Harare" inTabs />,
    );
    await waitFor(() =>
      expect(tree.getByLabelText(/^Averages\./)).toBeTruthy(),
    );
    for (const label of [
      "Air quality",
      "Wind",
      "UV index",
      "Feels like",
      "Visibility",
      "Precipitation",
      "Humidity",
      "Pressure",
      "Sun",
      "Moon",
      "Averages",
    ]) {
      const tile = tree.getByLabelText(new RegExp(`^${label}\\.`));
      expect(tile.props.accessibilityRole).toBe("button");
      expect(tile.props.accessibilityHint).toBe("Opens details");
    }
  });

  it("gives the new cards a header each, in the web's order", async () => {
    routeFetch(ROUTES);
    const tree = await render(
      <WeatherPage weather={harareWeather()} name="Harare" inTabs />,
    );
    await waitFor(() => expect(tree.getByTestId("haze-card")).toBeTruthy());
    const headers = tree.getAllByRole("header").map((h) => h.props.children);
    const at = (t: string) => headers.indexOf(t);
    expect(at("Conditions")).toBeGreaterThan(-1);
    expect(at("Air quality")).toBeGreaterThan(at("Conditions"));
    expect(at("Light smog")).toBeGreaterThan(at("Air quality"));
    expect(at("Wind")).toBeGreaterThan(at("Light smog"));
    expect(at("Next hour")).toBeGreaterThan(at("Averages"));
    expect(at("Model comparison")).toBeGreaterThan(at("Next hour"));
  });
});
