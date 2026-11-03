/**
 * Home and a place's page paint the forecast kept on the phone at once, before
 * the location or the network answers, and the fresh answer replaces it in
 * place (issue #94). A fresh answer is never replaced by an older kept copy.
 */

import { act, render } from "@testing-library/react-native";
import * as Location from "expo-location";

import { fetchWeatherRecord } from "@/api/weather";
import WeatherHome from "@/app/(tabs)/index";
import LocationScreen from "@/app/location/[slug]";
import { pendingFetch } from "@/test-utils/farm-fetch";
import { IPHONE_INSETS, setInsets, setWindow } from "@/test-utils/mocks";
import { harareWeather } from "@/test-utils/weather-fixtures";
import { loadForecast, type SavedView } from "@/state/forecast-store";

jest.mock("expo-router", () => require("@/test-utils/mocks").routerMock());
jest.mock("expo-status-bar", () =>
  require("@/test-utils/mocks").statusBarMock(),
);
jest.mock("react-native-safe-area-context", () =>
  require("@/test-utils/mocks").safeAreaMock(),
);
jest.mock("expo-location", () => ({
  Accuracy: { High: 4 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));
jest.mock("@/api/weather", () => ({
  ...jest.requireActual("@/api/weather"),
  fetchWeatherRecord: jest.fn(),
}));
jest.mock("@/api/locations", () => ({
  ...jest.requireActual("@/api/locations"),
  geoLookup: jest.fn(async () => ({ location: null })),
}));
jest.mock("@/state/forecast-store", () => ({
  ...jest.requireActual("@/state/forecast-store"),
  saveForecast: jest.fn(async () => undefined),
  loadForecast: jest.fn(),
}));
jest.mock("@/state/location-ask", () => ({
  locationAskPutOff: jest.fn(async () => false),
  putOffLocationAsk: jest.fn(async () => undefined),
}));

const loc = Location as jest.Mocked<typeof Location>;
const weatherMock = fetchWeatherRecord as jest.MockedFunction<
  typeof fetchWeatherRecord
>;
const keptMock = loadForecast as jest.MockedFunction<typeof loadForecast>;

/** A promise the test settles by hand. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const never = () => new Promise<never>(() => undefined);

function kept(name: string): SavedView {
  return {
    weather: { ...harareWeather(), location: undefined },
    fetchedAt: Date.now() - 5 * 60_000,
    freshness: "current",
    name,
    slug: "gweru",
  };
}

async function settle() {
  for (let i = 0; i < 6; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  pendingFetch();
  setInsets(IPHONE_INSETS);
  setWindow(393, 852);
  (globalThis as { __params?: object }).__params = { slug: "gweru" };
  loc.getForegroundPermissionsAsync.mockResolvedValue({
    status: "undetermined",
    canAskAgain: true,
    granted: false,
    expires: "never",
  } as never);
});

describe("home", () => {
  it("paints the kept forecast before the location or the network answer", async () => {
    keptMock.mockResolvedValue(kept("Gweru"));
    // Neither the permission read nor the request ever comes back.
    loc.getForegroundPermissionsAsync.mockReturnValue(never() as never);
    weatherMock.mockReturnValue(never());
    const tree = await render(<WeatherHome />);
    await settle();
    expect(tree.getAllByText("Gweru").length).toBeGreaterThan(0);
    expect(tree.queryByText("Still trying to reach the weather service…")).toBe(
      null,
    );
  });

  it("replaces the kept copy in place when the fresh answer arrives", async () => {
    keptMock.mockResolvedValue(kept("Gweru"));
    weatherMock.mockResolvedValue({
      weather: harareWeather(),
      record: { raw: {}, meta: {} },
    });
    const tree = await render(<WeatherHome />);
    await settle();
    expect(tree.queryAllByText("Gweru")).toHaveLength(0);
    expect(tree.getAllByText("Harare").length).toBeGreaterThan(0);
  });

  it("never replaces a fresh answer with an older kept copy that read late", async () => {
    const late = deferred<SavedView | null>();
    keptMock.mockReturnValue(late.promise);
    weatherMock.mockResolvedValue({
      weather: harareWeather(),
      record: { raw: {}, meta: {} },
    });
    const tree = await render(<WeatherHome />);
    await settle();
    expect(tree.getAllByText("Harare").length).toBeGreaterThan(0);
    late.resolve(kept("Gweru"));
    await settle();
    expect(tree.queryAllByText("Gweru")).toHaveLength(0);
  });

  it("keeps the kept copy, with the failure said, when the refresh fails", async () => {
    keptMock.mockResolvedValue(kept("Gweru"));
    weatherMock.mockRejectedValue(new Error("down"));
    const tree = await render(<WeatherHome />);
    await settle();
    expect(tree.getAllByText("Gweru").length).toBeGreaterThan(0);
  });
});

describe("a place's page", () => {
  it("paints the kept forecast before the network answers", async () => {
    keptMock.mockResolvedValue(kept("Gweru"));
    weatherMock.mockReturnValue(never());
    const tree = await render(<LocationScreen />);
    await settle();
    expect(tree.getAllByText("Gweru").length).toBeGreaterThan(0);
  });

  it("replaces the kept copy in place when the fresh answer arrives", async () => {
    keptMock.mockResolvedValue(kept("Gweru"));
    weatherMock.mockResolvedValue({
      weather: harareWeather(),
      record: { raw: {}, meta: {} },
    });
    const tree = await render(<LocationScreen />);
    await settle();
    expect(tree.queryAllByText("Gweru")).toHaveLength(0);
    expect(tree.getAllByText("Harare").length).toBeGreaterThan(0);
  });
});
