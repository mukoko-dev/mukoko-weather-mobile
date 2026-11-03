/**
 * The AI insight and its follow-up. Sign-in is switched off in the app (no
 * token exchange route exists), so what ships is the designed signed-out card:
 * it says why, has no dead Sign in button, and never calls the AI. Behind the
 * same switch the signed-in cards are built and tested here with a signed-in
 * session faked: loading, the insight, failure with retry, and the follow-up
 * conversation with its limit. Neither sends the person's activities.
 */

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import * as auth from "@/api/auth";
import { MAX_FOLLOWUP_MESSAGES } from "@/api/ai";
import { AiFollowup } from "@/components/weather/AiFollowup";
import { AiSummary } from "@/components/weather/AiSummary";
import { toggleActivity } from "@/state/preferences";
import { IPHONE_INSETS, setInsets, setWindow } from "@/test-utils/mocks";
import { resetPreferences } from "@/test-utils/preferences";
import { routedFetch } from "@/test-utils/routed-fetch";
import { HAS_EMOJI, allText } from "@/test-utils/weather-fixtures";

jest.mock("expo-router", () => require("@/test-utils/mocks").routerMock());
jest.mock("react-native-safe-area-context", () =>
  require("@/test-utils/mocks").safeAreaMock(),
);

const PLACE = {
  slug: "harare",
  name: "Harare",
  lat: -17.8252,
  lon: 31.0335,
  country: "ZW",
};

function signedIn(is: boolean) {
  jest
    .spyOn(auth, "getSession")
    .mockResolvedValue(is ? { accessToken: "test-session-token" } : null);
}

beforeEach(async () => {
  setInsets(IPHONE_INSETS);
  setWindow(393, 852);
  jest.clearAllMocks();
  await resetPreferences();
});

afterEach(() => jest.restoreAllMocks());

describe("sign-in is off (what ships)", () => {
  it("is off", () => {
    expect(auth.SIGN_IN_AVAILABLE).toBe(false);
  });

  it("the insight card is the signed-out state: it says why, has no Sign in button, and calls nothing", async () => {
    const calls = routedFetch({});
    const tree = await render(<AiSummary place={PLACE} />);
    expect(tree.getByText("Shamwari Weather Insight")).toBeTruthy();
    expect(
      tree.getByText("Sign in to see Mukoko's AI insights for Harare."),
    ).toBeTruthy();
    expect(
      tree.getByText(/Sign-in is not available in the app yet/),
    ).toBeTruthy();
    expect(tree.queryByLabelText("Sign in")).toBeNull();
    expect(calls).toHaveLength(0);
    expect(HAS_EMOJI.test(allText(tree.toJSON()))).toBe(false);
  });

  it("the follow-up shows nothing, because there is no insight to follow up", async () => {
    const tree = await render(
      <AiFollowup name="Harare" slug="harare" insight={null} />,
    );
    expect(tree.queryByTestId("ai-followup")).toBeNull();
  });

  it("with picks made, still asks the AI for nothing", async () => {
    toggleActivity("football");
    const calls = routedFetch({});
    await render(<AiSummary place={PLACE} />);
    expect(calls).toHaveLength(0);
  });
});

describe("sign-in is on but the person is signed out", () => {
  it("offers Sign in, which opens the sign-in screen", async () => {
    signedIn(false);
    routedFetch({});
    const tree = await render(<AiSummary place={PLACE} signInAvailable />);
    await fireEvent.press(await tree.findByLabelText("Sign in"));
    expect(router.push).toHaveBeenCalledWith("/sign-in");
    expect(tree.queryByText(/not available in the app yet/)).toBeNull();
  });
});

describe("signed in (the built, switched-off state)", () => {
  it("loads the insight, shows it, and hands it up", async () => {
    signedIn(true);
    toggleActivity("football");
    const calls = routedFetch({
      "POST /v1/ai/summary": {
        body: {
          insight: "**Warm** and dry.\n- Water the garden",
          cached: false,
        },
      },
    });
    const onLoaded = jest.fn();
    const tree = await render(
      <AiSummary place={PLACE} signInAvailable onLoaded={onLoaded} />,
    );
    expect(await tree.findByText("Warm")).toBeTruthy();
    expect(tree.getByText("Water the garden")).toBeTruthy();
    expect(onLoaded).toHaveBeenCalledWith(
      "**Warm** and dry.\n- Water the garden",
    );
    expect(calls).toHaveLength(1);
    // The place only: no activities, no coordinates beyond the place's own.
    expect(JSON.stringify(calls[0].body)).not.toMatch(/football|activit/i);
    expect(calls[0].body).toEqual({
      location: {
        slug: "harare",
        name: "Harare",
        lat: -17.8252,
        lon: 31.0335,
        country: "ZW",
      },
    });
  });

  it("a label that improves after first paint does not cancel the request and spend a second one", async () => {
    signedIn(true);
    const calls = routedFetch({
      "POST /v1/ai/summary": { body: { insight: "Warm." } },
    });
    const tree = await render(<AiSummary place={PLACE} signInAvailable />);
    await tree.rerender(
      <AiSummary place={{ ...PLACE, name: "Harare CBD" }} signInAvailable />,
    );
    expect(await tree.findByText("Warm.")).toBeTruthy();
    expect(calls).toHaveLength(1);
    // A different place is a different request.
    await tree.rerender(
      <AiSummary
        place={{
          ...PLACE,
          slug: "bulawayo",
          name: "Bulawayo",
          lat: -20.15,
          lon: 28.58,
        }}
        signInAvailable
      />,
    );
    await waitFor(() => expect(calls).toHaveLength(2));
  });

  it("shows a failure and a retry that asks again", async () => {
    signedIn(true);
    routedFetch({
      "POST /v1/ai/summary": { status: 503, body: { error: "x" } },
    });
    const tree = await render(<AiSummary place={PLACE} signInAvailable />);
    expect(await tree.findByText(/Unable to load the AI summary/)).toBeTruthy();
    routedFetch({ "POST /v1/ai/summary": { body: { insight: "Fine." } } });
    await fireEvent.press(tree.getByLabelText("Try again"));
    expect(await tree.findByText("Fine.")).toBeTruthy();
  });
});

describe("the follow-up, signed in", () => {
  async function open(insight = "Warm and dry.") {
    signedIn(true);
    const tree = await render(
      <AiFollowup
        name="Harare"
        slug="harare"
        insight={insight}
        signInAvailable
      />,
    );
    await fireEvent.press(
      await tree.findByLabelText("Ask a follow-up question"),
    );
    return tree;
  }

  it("starts collapsed, opens on a tap, and says expanded", async () => {
    signedIn(true);
    const tree = await render(
      <AiFollowup
        name="Harare"
        slug="harare"
        insight="Warm."
        signInAvailable
      />,
    );
    const toggle = await tree.findByLabelText("Ask a follow-up question");
    expect(toggle.props.accessibilityState.expanded).toBe(false);
    expect(tree.queryByLabelText("Follow-up question")).toBeNull();
    await fireEvent.press(toggle);
    expect(tree.getByLabelText("Follow-up question")).toBeTruthy();
    expect(
      tree.getByLabelText("Ask a follow-up question").props.accessibilityState
        .expanded,
    ).toBe(true);
  });

  it("sends a question with the insight and no activities, and shows the reply", async () => {
    toggleActivity("football");
    const calls = routedFetch({
      "POST /v1/ai/followup": { body: { response: "No rain until Friday." } },
    });
    const tree = await open();
    expect(tree.getByLabelText("Send").props.accessibilityState.disabled).toBe(
      true,
    );
    await fireEvent.changeText(
      tree.getByLabelText("Follow-up question"),
      "Will it rain?",
    );
    await fireEvent.press(tree.getByLabelText("Send"));
    expect(await tree.findByText("No rain until Friday.")).toBeTruthy();
    expect(tree.getByText("Will it rain?")).toBeTruthy();
    expect(calls[0].body).toMatchObject({
      message: "Will it rain?",
      locationName: "Harare",
      locationSlug: "harare",
      weatherSummary: "Warm and dry.",
      history: [],
    });
    expect(JSON.stringify(calls[0].body)).not.toMatch(/football|activit/i);
  });

  it("shows a failed reply as the assistant's line", async () => {
    routedFetch({
      "POST /v1/ai/followup": { status: 429, body: { error: "rate_limited" } },
    });
    const tree = await open();
    await fireEvent.changeText(
      tree.getByLabelText("Follow-up question"),
      "Hello",
    );
    await fireEvent.press(tree.getByLabelText("Send"));
    expect(await tree.findByText(/reached its limit for now/)).toBeTruthy();
  });

  it("a failed answer uses up no question and never goes back as history", async () => {
    let n = 0;
    const calls = routedFetch({
      "POST /v1/ai/followup": () =>
        (n += 1) === 1
          ? { status: 429, body: { error: "rate_limited" } }
          : { body: { response: "Dry all week." } },
    });
    const tree = await open();
    for (const q of ["First try", "Second try"]) {
      await fireEvent.changeText(tree.getByLabelText("Follow-up question"), q);
      await fireEvent.press(tree.getByLabelText("Send"));
      await waitFor(() =>
        expect(calls).toHaveLength(q === "First try" ? 1 : 2),
      );
    }
    expect(await tree.findByText("Dry all week.")).toBeTruthy();
    // The second question's history holds neither the failed turn nor its line.
    expect((calls[1].body as { history: unknown[] }).history).toEqual([]);
  });

  it("stops at five questions and points to the Shamwari tab", async () => {
    routedFetch({ "POST /v1/ai/followup": { body: { response: "OK." } } });
    const tree = await open();
    for (let i = 0; i < MAX_FOLLOWUP_MESSAGES; i += 1) {
      await fireEvent.changeText(
        tree.getByLabelText("Follow-up question"),
        `Question ${i}`,
      );
      await fireEvent.press(tree.getByLabelText("Send"));
      await waitFor(() => expect(tree.getAllByText("OK.")).toHaveLength(i + 1));
    }
    expect(tree.queryByLabelText("Follow-up question")).toBeNull();
    expect(tree.getByText(/reached the follow-up limit/)).toBeTruthy();
    await fireEvent.press(tree.getByLabelText("Continue in Shamwari"));
    expect(router.navigate).toHaveBeenCalledWith("/shamwari");
  });

  it("shows nothing until there is an insight to follow up", async () => {
    signedIn(true);
    const tree = await render(
      <AiFollowup name="Harare" slug="harare" insight={null} signInAvailable />,
    );
    expect(tree.queryByTestId("ai-followup")).toBeNull();
  });
});
