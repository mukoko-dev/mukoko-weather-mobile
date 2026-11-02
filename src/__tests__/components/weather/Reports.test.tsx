/**
 * The community reports card and the report wizard. The switch is OFF in the
 * shipped app, so the first block proves that state is honest and silent (no
 * request, the wizard cannot send). The rest runs with the switch ON through
 * the test seam, against replies written from the Worker's contract, to prove
 * the screens are right for the day the routes are live.
 */

import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { COMMUNITY_REPORTS_ENABLED } from "@/api/reports";
import { RecentReports } from "@/components/weather/RecentReports";
import { ReportWizardSheet } from "@/components/weather/ReportWizardSheet";
import { REPORT_TYPES } from "@/shared/report-types";
import { IPHONE_INSETS, setInsets, setWindow } from "@/test-utils/mocks";
import { routedFetch } from "@/test-utils/routed-fetch";
import { HAS_EMOJI, NOW, allText } from "@/test-utils/weather-fixtures";

jest.mock("react-native-safe-area-context", () =>
  require("@/test-utils/mocks").safeAreaMock(),
);

const ID = "0123456789abcdef01234567";
const REPORT = {
  id: ID,
  reportType: "heavy-rain",
  severity: "severe",
  description: "Roads are flooding near the market",
  reportedAt: "2026-11-01T00:15:00.000Z",
  upvotes: 2,
  verified: true,
  locationName: "Harare",
};

beforeEach(() => {
  setInsets(IPHONE_INSETS);
  setWindow(393, 852);
});

describe("with the switch off (what ships)", () => {
  it("is pinned off", () => {
    expect(COMMUNITY_REPORTS_ENABLED).toBe(false);
  });

  it("the card says reports are not live, offers the wizard, and asks the network for nothing", async () => {
    const calls = routedFetch({});
    const tree = await render(
      <RecentReports slug="harare" name="Harare" now={NOW} />,
    );
    expect(tree.getByText("Community reports")).toBeTruthy();
    expect(tree.getByTestId("reports-off")).toBeTruthy();
    expect(
      tree.getByText(/Community reports are not live in the app yet/),
    ).toBeTruthy();
    // It must not claim there are no reports, or invite the first one.
    expect(tree.queryByText(/Be the first/)).toBeNull();
    expect(tree.getByLabelText("Report weather")).toBeTruthy();
    expect(calls).toHaveLength(0);
    expect(HAS_EMOJI.test(allText(tree.toJSON()))).toBe(false);
  });

  it("the wizard can be walked through, says at the top that nothing is sent, and its Send is disabled", async () => {
    const calls = routedFetch({});
    const tree = await render(
      <RecentReports slug="harare" name="Harare" now={NOW} />,
    );
    await fireEvent.press(tree.getByLabelText("Report weather"));
    expect(await tree.findByTestId("reports-not-live")).toBeTruthy();
    expect(
      tree.getByText("Sending reports is not switched on yet."),
    ).toBeTruthy();

    // Step 1: thirteen types, one tap each.
    for (const t of REPORT_TYPES) {
      expect(tree.getByTestId(`report-type-${t.id}`)).toBeTruthy();
    }
    await fireEvent.press(tree.getByTestId("report-type-frost"));

    // Step 2: the Worker's two questions, severity, description, a disabled Send.
    expect(tree.getByText("Tell us more about the frost.")).toBeTruthy();
    expect(tree.getByText("Is the frost visible on surfaces?")).toBeTruthy();
    expect(tree.getByText("Are your car windows frosted over?")).toBeTruthy();
    expect(tree.getByTestId("reports-not-live")).toBeTruthy();
    const send = tree.getByLabelText("Send report");
    expect(send.props.accessibilityState.disabled).toBe(true);
    expect(send.props.accessibilityHint).toBe(
      "Sending reports is not switched on yet",
    );
    await fireEvent.press(send);
    expect(calls).toHaveLength(0);
  });
});

describe("with the switch on (the contract)", () => {
  it("lists the reports with type, severity, Verified, age and votes", async () => {
    const calls = routedFetch({
      "GET /v1/reports": { body: { reports: [REPORT], location: "harare" } },
    });
    const tree = await render(
      <RecentReports slug="harare" name="Harare" now={NOW} enabled />,
    );
    expect(await tree.findByText("Heavy Rain")).toBeTruthy();
    expect(tree.getByText("severe")).toBeTruthy();
    expect(tree.getByText("Verified")).toBeTruthy();
    expect(tree.getByText("Roads are flooding near the market")).toBeTruthy();
    // 00:15 UTC to the fixed "now" 00:45 UTC.
    expect(tree.getByText("30 min ago")).toBeTruthy();
    expect(tree.getByLabelText("Upvote report, 2 votes")).toBeTruthy();
    expect(calls[0].url).toContain("/v1/reports?location=harare&hours=24");
    expect(HAS_EMOJI.test(allText(tree.toJSON()))).toBe(false);
  });

  it("says there are none, and invites the first, when the list is empty", async () => {
    routedFetch({ "GET /v1/reports": { body: { reports: [] } } });
    const tree = await render(
      <RecentReports slug="harare" name="Harare" now={NOW} enabled />,
    );
    expect(
      await tree.findByText("No reports in the last 24 hours. Be the first!"),
    ).toBeTruthy();
  });

  it("shows a failure with a retry that asks again", async () => {
    routedFetch({
      "GET /v1/reports": { status: 503, body: { error: "unavailable" } },
    });
    const tree = await render(
      <RecentReports slug="harare" name="Harare" now={NOW} enabled />,
    );
    expect(await tree.findByText(/Could not load the reports/)).toBeTruthy();
    routedFetch({ "GET /v1/reports": { body: { reports: [REPORT] } } });
    await fireEvent.press(tree.getByLabelText("Try again"));
    expect(await tree.findByText("Heavy Rain")).toBeTruthy();
  });

  it("counts an upvote on screen only once the server counted it, and only once per report", async () => {
    routedFetch({
      "GET /v1/reports": { body: { reports: [REPORT] } },
      "POST /v1/reports/upvote": { body: { upvoted: true } },
    });
    const tree = await render(
      <RecentReports slug="harare" name="Harare" now={NOW} enabled />,
    );
    const vote = await tree.findByLabelText("Upvote report, 2 votes");
    await fireEvent.press(vote);
    await waitFor(() =>
      expect(tree.getByLabelText("Upvote report, 3 votes")).toBeTruthy(),
    );
    expect(
      tree.getByLabelText("Upvote report, 3 votes").props.accessibilityState,
    ).toMatchObject({ selected: true, disabled: true });
  });

  it("does not count a vote the server did not count", async () => {
    routedFetch({
      "GET /v1/reports": { body: { reports: [REPORT] } },
      "POST /v1/reports/upvote": {
        body: { upvoted: false, reason: "Already upvoted or report not found" },
      },
    });
    const tree = await render(
      <RecentReports slug="harare" name="Harare" now={NOW} enabled />,
    );
    await fireEvent.press(await tree.findByLabelText("Upvote report, 2 votes"));
    await waitFor(() =>
      expect(tree.getByLabelText("Upvote report, 2 votes")).toBeTruthy(),
    );
  });

  it("says a place the service does not name has no reports", async () => {
    const calls = routedFetch({});
    const tree = await render(
      <RecentReports slug={undefined} name="Somewhere" now={NOW} enabled />,
    );
    expect(
      tree.getByText(/Somewhere has no name the weather service knows/),
    ).toBeTruthy();
    expect(calls).toHaveLength(0);
  });
});

describe("the wizard with the switch on", () => {
  async function toStepTwo(tree: Awaited<ReturnType<typeof render>>) {
    await fireEvent.press(tree.getByTestId("report-type-heavy-rain"));
  }

  it("sends the slug and choices and NO coordinate, then confirms", async () => {
    const calls = routedFetch({
      "POST /v1/reports": {
        status: 201,
        body: { id: ID, verified: true, expiresIn: 259200 },
      },
    });
    const tree = await render(
      <ReportWizardSheet
        visible
        onClose={jest.fn()}
        locationSlug="harare"
        locationName="Harare"
        enabled
      />,
    );
    expect(tree.queryByTestId("reports-not-live")).toBeNull();
    await toStepTwo(tree);
    await fireEvent.press(
      tree.getByLabelText("Severe: Dangerous or highly disruptive"),
    );
    await fireEvent.changeText(
      tree.getByLabelText("Description, optional"),
      "  Water is over the kerb ",
    );
    await fireEvent.press(tree.getByLabelText("Send report"));
    expect(await tree.findByText("Report sent")).toBeTruthy();
    expect(
      tree.getByText(/Your heavy rain report for Harare has been sent/),
    ).toBeTruthy();
    expect(calls).toHaveLength(1);
    expect(calls[0].body).toEqual({
      locationSlug: "harare",
      reportType: "heavy-rain",
      severity: "severe",
      description: "Water is over the kerb",
    });
    expect(JSON.stringify(calls[0].body)).not.toMatch(/lat|lon/);
  });

  it("defaults the severity to moderate", async () => {
    const calls = routedFetch({
      "POST /v1/reports": { status: 201, body: { id: ID } },
    });
    const tree = await render(
      <ReportWizardSheet
        visible
        onClose={jest.fn()}
        locationSlug="harare"
        locationName="Harare"
        enabled
      />,
    );
    await toStepTwo(tree);
    expect(
      tree.getByLabelText("Moderate: Affecting plans or travel").props
        .accessibilityState.checked,
    ).toBe(true);
    await fireEvent.press(tree.getByLabelText("Send report"));
    await tree.findByText("Report sent");
    expect((calls[0].body as { severity: string }).severity).toBe("moderate");
  });

  it("keeps the draft and says why when the server refuses (rate limit)", async () => {
    routedFetch({
      "POST /v1/reports": { status: 429, body: { error: "rate_limited" } },
    });
    const tree = await render(
      <ReportWizardSheet
        visible
        onClose={jest.fn()}
        locationSlug="harare"
        locationName="Harare"
        enabled
      />,
    );
    await toStepTwo(tree);
    await fireEvent.changeText(
      tree.getByLabelText("Description, optional"),
      "keep me",
    );
    await fireEvent.press(tree.getByLabelText("Send report"));
    expect(
      await tree.findByText(/most reports allowed this hour/),
    ).toBeTruthy();
    expect(tree.getByLabelText("Description, optional").props.value).toBe(
      "keep me",
    );
    // It can be sent again.
    expect(
      tree.getByLabelText("Send report").props.accessibilityState.disabled,
    ).toBe(false);
  });

  it("caps the description at 300 and shows the count", async () => {
    routedFetch({});
    const tree = await render(
      <ReportWizardSheet
        visible
        onClose={jest.fn()}
        locationSlug="harare"
        locationName="Harare"
        enabled
      />,
    );
    await toStepTwo(tree);
    const input = tree.getByLabelText("Description, optional");
    expect(input.props.maxLength).toBe(300);
    await fireEvent.changeText(input, "a".repeat(120));
    expect(tree.getByText("120/300")).toBeTruthy();
  });

  it("goes Back to the types, and forgets the draft when closed", async () => {
    routedFetch({});
    const tree = await render(
      <ReportWizardSheet
        visible
        onClose={jest.fn()}
        locationSlug="harare"
        locationName="Harare"
        enabled
      />,
    );
    await toStepTwo(tree);
    await fireEvent.press(tree.getByLabelText("Back"));
    expect(tree.getByTestId("report-type-hail")).toBeTruthy();
    await tree.rerender(
      <ReportWizardSheet
        visible={false}
        onClose={jest.fn()}
        locationSlug="harare"
        locationName="Harare"
        enabled
      />,
    );
    await tree.rerender(
      <ReportWizardSheet
        visible
        onClose={jest.fn()}
        locationSlug="harare"
        locationName="Harare"
        enabled
      />,
    );
    expect(tree.getByTestId("report-type-hail")).toBeTruthy();
  });

  it("refuses to send for a place with no name the service knows", async () => {
    const calls = routedFetch({});
    const tree = await render(
      <ReportWizardSheet
        visible
        onClose={jest.fn()}
        locationSlug={undefined}
        locationName="Somewhere"
        enabled
      />,
    );
    await toStepTwo(tree);
    await fireEvent.press(tree.getByLabelText("Send report"));
    expect(await tree.findByText(/cannot take a report/)).toBeTruthy();
    expect(calls).toHaveLength(0);
  });
});
