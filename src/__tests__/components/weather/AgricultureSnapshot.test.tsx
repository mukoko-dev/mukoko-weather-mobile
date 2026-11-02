/**
 * The agriculture snapshot card from recorded Worker answers: every state a
 * person can reach (loading, ready, the Worker's four "no data" reasons and an
 * unnamed one, a failed request and its retry), the card and page variants,
 * the honest advice line while sign-in is off, and the words a person hears.
 */

import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { AgricultureSnapshot } from "@/components/weather/AgricultureSnapshot";
import { type PlaceInfo } from "@/shared/place-info";

import agricultureOff from "@/api/__fixtures__/agriculture-unavailable.json";
import { RECORDED, type Route, routeFetch } from "@/test-utils/farm-fetch";
import { HAS_EMOJI, allText } from "@/test-utils/weather-fixtures";

jest.mock("expo-router", () => require("@/test-utils/mocks").routerMock());
jest.mock("react-native-safe-area-context", () =>
  require("@/test-utils/mocks").safeAreaMock(),
);

const HARARE: PlaceInfo = {
  slug: "harare",
  name: "Harare",
  lat: -17.83,
  lon: 31.05,
  country: "ZW",
  province: "Harare",
};

const agri = (route: Route) => ({ ...RECORDED, "/v1/agriculture": route });

describe("AgricultureSnapshot", () => {
  it("is a loading card, one busy item for VoiceOver, until the Worker answers", async () => {
    routeFetch({ "/v1/agriculture": "hang" });
    const tree = await render(
      <AgricultureSnapshot place={HARARE} crops={[]} />,
    );
    const loading = tree.getByTestId("card-loading");
    expect(loading.props.accessibilityLabel).toBe("Loading farm weather");
    expect(loading.props.accessibilityState).toEqual({ busy: true });
  });

  it("shows the recorded Harare picture: verdict, four windows, six figures", async () => {
    const asked = routeFetch(RECORDED);
    const tree = await render(
      <AgricultureSnapshot place={HARARE} crops={["crop-farming"]} />,
    );
    expect(
      await tree.findByText("Good day to spray, harvest and irrigate."),
    ).toBeTruthy();
    expect(asked).toEqual(["/v1/agriculture"]);
    // The verdict is a word, not only a colour.
    expect(tree.getByLabelText("Go overall for field work today")).toBeTruthy();
    // Each window names its status in words and its label.
    expect(
      tree.getByLabelText("Spray: Go. Spray today 06:00–10:00"),
    ).toBeTruthy();
    expect(
      tree.getByLabelText("Plant: Wait. Wait for planting rains"),
    ).toBeTruthy();
    expect(tree.getByLabelText("Harvest: Go. 3 dry days ahead")).toBeTruthy();
    expect(
      tree.getByLabelText("Irrigate: Go. Irrigate: 21 mm deficit"),
    ).toBeTruthy();
    // The six figures, the web's order and formats.
    expect(tree.getByLabelText("Rain 24 h / 7 d: 0 mm / 0 mm")).toBeTruthy();
    expect(tree.getByLabelText("Topsoil moisture: 14% · Dry")).toBeTruthy();
    expect(tree.getByLabelText("Soil at seed depth: 19°C")).toBeTruthy();
    expect(tree.getByLabelText("Water balance 7 d: −51 mm")).toBeTruthy();
    expect(tree.getByLabelText("GDD past 30 d: 354")).toBeTruthy();
    expect(tree.getByLabelText("Spray wind: 11 km/h · Not now")).toBeTruthy();
    // A heat spell is a sentence, not only a colour.
    expect(tree.getByText(/Hot spell from Tue 3/)).toBeTruthy();
    expect(HAS_EMOJI.test(allText(tree.toJSON()))).toBe(false);
  });

  it("sends the place, its country and the crops to the Worker", async () => {
    routeFetch(RECORDED);
    await render(
      <AgricultureSnapshot
        place={HARARE}
        crops={["crop-farming", "livestock"]}
      />,
    );
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
    const url = new URL(
      String((globalThis.fetch as jest.Mock).mock.calls[0][0]),
    );
    expect(url.searchParams.get("location")).toBe("harare");
    expect(url.searchParams.get("country")).toBe("ZW");
    expect(url.searchParams.get("crops")).toBe("crop-farming,livestock");
  });

  it("says Shamwari's advice needs an account and that sign-in is not available, with no sign-in button", async () => {
    routeFetch(RECORDED);
    const tree = await render(
      <AgricultureSnapshot place={HARARE} crops={[]} />,
    );
    await tree.findByText("Good day to spray, harvest and irrigate.");
    expect(
      tree.getByText(
        "Shamwari's farm advice for Harare needs an account, and sign-in is not available in the app yet.",
      ),
    ).toBeTruthy();
    expect(tree.queryByRole("button", { name: /sign in/i })).toBeNull();
    expect(tree.queryByText(/sign in$/i)).toBeNull();
  });

  it("links to the insights page on the card, and not on the page variant", async () => {
    routeFetch(RECORDED);
    const onOpen = jest.fn();
    const card = await render(
      <AgricultureSnapshot place={HARARE} crops={[]} onOpenInsights={onOpen} />,
    );
    await card.findByText("Good day to spray, harvest and irrigate.");
    await fireEvent.press(
      card.getByRole("link", { name: "Full agriculture insights →" }),
    );
    expect(onOpen).toHaveBeenCalledTimes(1);
    await card.unmount();

    routeFetch(RECORDED);
    const page = await render(
      <AgricultureSnapshot
        place={HARARE}
        crops={[]}
        variant="page"
        onOpenInsights={onOpen}
      />,
    );
    await page.findByText("Good day to spray, harvest and irrigate.");
    expect(page.queryByRole("link")).toBeNull();
    expect(page.queryByText(/Shamwari's farm advice/)).toBeNull();
  });

  it.each([
    ["provider_unavailable", "Farm data is paused", true],
    ["provider_error", "No farm data for this point", true],
    ["insufficient_data", "Not enough forecast hours yet", true],
    ["analysis_error", "The farm numbers could not be worked out", false],
    [null, "Farm data is not available", true],
  ] as const)(
    "tells a person what the Worker said (%s) and offers a retry only when it can help",
    async (reason, title, retry) => {
      routeFetch(agri({ body: { ...agricultureOff, reason } }));
      const tree = await render(
        <AgricultureSnapshot place={HARARE} crops={[]} />,
      );
      expect(await tree.findByText(title)).toBeTruthy();
      expect(tree.getByTestId("agriculture-unavailable")).toBeTruthy();
      expect(!!tree.queryByRole("button", { name: "Try again" })).toBe(retry);
      // No verdict, no windows, no invented numbers.
      expect(tree.queryByText(/Go|Wait|Hold off/)).toBeNull();
    },
  );

  it("retries an unavailable answer and shows the picture when it comes back", async () => {
    routeFetch(
      agri({ body: { ...agricultureOff, reason: "provider_unavailable" } }),
    );
    const tree = await render(
      <AgricultureSnapshot place={HARARE} crops={[]} />,
    );
    await tree.findByText("Farm data is paused");
    routeFetch(RECORDED);
    await fireEvent.press(tree.getByRole("button", { name: "Try again" }));
    expect(
      await tree.findByText("Good day to spray, harvest and irrigate."),
    ).toBeTruthy();
  });

  it("says the request failed (offline) in plain words with Try again", async () => {
    routeFetch(agri("offline"));
    const tree = await render(
      <AgricultureSnapshot place={HARARE} crops={[]} />,
    );
    expect(await tree.findByText("Farm weather did not load")).toBeTruthy();
    expect(tree.getByText(/Mukoko could not be reached/)).toBeTruthy();
    expect(tree.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("treats a 422 (a bad point) as a failed request, not as farm data", async () => {
    routeFetch(
      agri({
        status: 422,
        body: {
          error: "invalid_request",
          error_description: "Give valid `lat` and `lon`.",
        },
      }),
    );
    const tree = await render(
      <AgricultureSnapshot place={HARARE} crops={[]} />,
    );
    expect(await tree.findByText("Farm weather did not load")).toBeTruthy();
  });
});
