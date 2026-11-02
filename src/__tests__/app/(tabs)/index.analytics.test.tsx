/**
 * The home tab records forecast_shown (surface "home") once the forecast is
 * on screen, with a coarse place only: never the coordinate.
 */

import { render, waitFor } from "@testing-library/react-native";

const mockTrack = jest.fn();
jest.mock("expo-router", () => require("@/test-utils/mocks").routerMock());
jest.mock("react-native-safe-area-context", () =>
  require("@/test-utils/mocks").safeAreaMock(),
);
jest.mock("@/analytics", () => ({
  ...jest.requireActual("@/analytics"),
  track: (...args: unknown[]) => mockTrack(...args),
}));
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: async () => ({ status: "denied" }),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { High: 4 },
}));
jest.mock("@/api/weather", () => ({
  ...jest.requireActual("@/api/weather"),
  fetchWeather: jest.fn(async () => {
    const { harareWeather } = jest.requireActual<
      typeof import("@/test-utils/weather-fixtures")
    >("@/test-utils/weather-fixtures");
    return { ...harareWeather(), location: undefined };
  }),
}));
jest.mock("@/api/locations", () => ({
  ...jest.requireActual("@/api/locations"),
  geoLookup: jest.fn(async () => ({ location: null })),
}));
jest.mock("@/components/weather/WeatherPage", () => ({
  WeatherPage: () => null,
  WeatherError: () => null,
}));

import WeatherHome from "@/app/(tabs)/index";

describe("home tab analytics", () => {
  it("records forecast_shown for the home surface with a coarse place", async () => {
    await render(<WeatherHome />);
    await waitFor(() => expect(mockTrack).toHaveBeenCalled());
    expect(mockTrack).toHaveBeenCalledWith("forecast_shown", {
      surface: "home",
      // Location denied: the Harare default, as a country and a cell.
      place: { country: "ZW", cell: "ksy4" },
    });
    expect(JSON.stringify(mockTrack.mock.calls)).not.toMatch(/-17\.|31\./);
  });
});
