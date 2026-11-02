/**
 * The Weather tab's location ask (issues #65, #66), as the web does it: the
 * default city's forecast shows at once, the system prompt only follows a tap
 * on "Use my location", and a blocked permission is said in words with the
 * ways forward (Settings, Search).
 */

import { act, fireEvent, render } from "@testing-library/react-native";
import * as Location from "expo-location";
import { router } from "expo-router";
import { Linking } from "react-native";

import { fetchWeatherRecord } from "@/api/weather";
import WeatherHome from "@/app/(tabs)/index";
import { LOCATION_PROBLEM_COPY } from "@/components/weather/LocationPromptCard";
import { pendingFetch } from "@/test-utils/farm-fetch";
import { IPHONE_INSETS, setInsets, setWindow } from "@/test-utils/mocks";
import { harareWeather } from "@/test-utils/weather-fixtures";

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
  loadForecast: jest.fn(async () => null),
}));
jest.mock("@/state/location-ask", () => ({
  locationAskPutOff: jest.fn(async () => false),
  putOffLocationAsk: jest.fn(async () => undefined),
}));

const loc = Location as jest.Mocked<typeof Location>;
const weatherMock = fetchWeatherRecord as jest.MockedFunction<
  typeof fetchWeatherRecord
>;

function permission(status: string, canAskAgain = true) {
  return {
    status,
    canAskAgain,
    granted: status === "granted",
    expires: "never",
  };
}

async function settle() {
  for (let i = 0; i < 5; i++) {
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
  weatherMock.mockResolvedValue({
    weather: harareWeather(),
    record: { raw: {}, meta: {} },
  });
});

it("shows the default city at once and never asks on the first frame (#65)", async () => {
  loc.getForegroundPermissionsAsync.mockResolvedValue(
    permission("undetermined") as never,
  );
  const tree = await render(<WeatherHome />);
  await settle();
  expect(loc.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  expect(weatherMock).toHaveBeenCalledTimes(1);
  expect(tree.getByText("Showing weather for Harare")).toBeTruthy();
  // The default city is not the person's place.
  expect(tree.queryByText("My Location")).toBeNull();
});

it("asks only after the tap, then shows the person's own place", async () => {
  loc.getForegroundPermissionsAsync.mockResolvedValue(
    permission("undetermined") as never,
  );
  loc.requestForegroundPermissionsAsync.mockResolvedValue(
    permission("granted") as never,
  );
  loc.getCurrentPositionAsync.mockResolvedValue({
    coords: { latitude: -17.83, longitude: 31.05 },
  } as never);
  const tree = await render(<WeatherHome />);
  await settle();
  await fireEvent.press(tree.getByRole("button", { name: "Use my location" }));
  await settle();
  expect(loc.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  expect(weatherMock).toHaveBeenLastCalledWith(
    { lat: -17.83, lon: 31.05 },
    expect.anything(),
  );
  expect(tree.queryByTestId("location-prompt")).toBeNull();
});

it("says location is off, with Settings and Search, when it is blocked (#66)", async () => {
  loc.getForegroundPermissionsAsync.mockResolvedValue(
    permission("denied", false) as never,
  );
  const open = jest.spyOn(Linking, "openSettings").mockResolvedValue();
  const tree = await render(<WeatherHome />);
  await settle();
  expect(tree.getByText(LOCATION_PROBLEM_COPY.denied)).toBeTruthy();
  await fireEvent.press(tree.getByRole("button", { name: "Open Settings" }));
  expect(open).toHaveBeenCalled();
  await fireEvent.press(tree.getByRole("button", { name: "Search" }));
  expect(router.navigate).toHaveBeenCalledWith("/my");
  expect(loc.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
});

it("uses the fix silently when location is already allowed", async () => {
  loc.getForegroundPermissionsAsync.mockResolvedValue(
    permission("granted") as never,
  );
  loc.getCurrentPositionAsync.mockResolvedValue({
    coords: { latitude: -17.83, longitude: 31.05 },
  } as never);
  const tree = await render(<WeatherHome />);
  await settle();
  expect(loc.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  expect(tree.queryByTestId("location-prompt")).toBeNull();
  expect(tree.getByText("My Location")).toBeTruthy();
});

it("keeps the ask askable when the system may ask again (Android's Deny)", async () => {
  loc.getForegroundPermissionsAsync.mockResolvedValue(
    permission("undetermined") as never,
  );
  loc.requestForegroundPermissionsAsync.mockResolvedValue(
    permission("denied", true) as never,
  );
  const tree = await render(<WeatherHome />);
  await settle();
  await fireEvent.press(tree.getByRole("button", { name: "Use my location" }));
  await settle();
  expect(tree.getByText(LOCATION_PROBLEM_COPY.declined)).toBeTruthy();
  expect(tree.getByRole("button", { name: "Use my location" })).toBeTruthy();
  expect(tree.queryByRole("button", { name: "Open Settings" })).toBeNull();
});

it("goes back to the default city, saying why, when the person's place does not load", async () => {
  loc.getForegroundPermissionsAsync.mockResolvedValue(
    permission("undetermined") as never,
  );
  loc.requestForegroundPermissionsAsync.mockResolvedValue(
    permission("granted") as never,
  );
  loc.getCurrentPositionAsync.mockResolvedValue({
    coords: { latitude: -17.83, longitude: 31.05 },
  } as never);
  const tree = await render(<WeatherHome />);
  await settle();
  weatherMock.mockRejectedValueOnce(new Error("down"));
  await fireEvent.press(tree.getByRole("button", { name: "Use my location" }));
  await settle();
  expect(tree.getByText(LOCATION_PROBLEM_COPY["no-weather"])).toBeTruthy();
  expect(tree.getByText("Showing weather for Harare")).toBeTruthy();
  expect(tree.queryByTestId("weather-error")).toBeNull();
});
