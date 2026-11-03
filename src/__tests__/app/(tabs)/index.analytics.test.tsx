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
  // Never decided: home shows the default city without asking.
  getForegroundPermissionsAsync: async () => ({
    status: "undetermined",
    canAskAgain: true,
    granted: false,
    expires: "never",
  }),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { High: 4 },
}));
jest.mock("@/api/weather", () => ({
  ...jest.requireActual("@/api/weather"),
  fetchWeatherRecord: jest.fn(async () => {
    const { harareWeather } = jest.requireActual<
      typeof import("@/test-utils/weather-fixtures")
    >("@/test-utils/weather-fixtures");
    return {
      weather: { ...harareWeather(), location: undefined },
      record: { raw: {}, meta: {} },
    };
  }),
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
      // Location not asked: the Harare default, as a country and a cell.
      place: { country: "ZW", cell: "ksy4" },
    });
    expect(JSON.stringify(mockTrack.mock.calls)).not.toMatch(/-17\.|31\./);
  });
});
