/**
 * The one detail sheet: a modal task with a clear end. Closed it draws nothing;
 * open it names itself, holds VoiceOver inside, has a 48 dp+ Close button, and
 * the swipe/back gesture closes it too.
 */

import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import {
  DetailSheet,
  SheetSection,
  StatGrid,
} from "@/components/weather/DetailSheet";
import { InsightCard } from "@/components/weather/InsightCard";
import { TOUCH } from "@/theme/mzizi";
import { IPHONE_INSETS, setInsets, setWindow } from "@/test-utils/mocks";
import { Text } from "react-native";

jest.mock("react-native-safe-area-context", () =>
  require("@/test-utils/mocks").safeAreaMock(),
);

beforeEach(() => {
  setInsets(IPHONE_INSETS);
  setWindow(393, 852);
});

describe("DetailSheet", () => {
  it("draws nothing while closed", async () => {
    const tree = await render(
      <DetailSheet open={false} title="Wind" onClose={jest.fn()}>
        <Text>inside</Text>
      </DetailSheet>,
    );
    expect(tree.queryByText("inside")).toBeNull();
  });

  it("names itself, shows its headline, sentence, content and explanation", async () => {
    const tree = await render(
      <DetailSheet
        open
        title="Wind"
        headline="12 km/h E"
        sentence="Steady."
        about="Wind is air moving."
        onClose={jest.fn()}
      >
        <SheetSection heading="Next 24 hours">
          <Text>chart</Text>
        </SheetSection>
        <StatGrid stats={[{ label: "Gusts", value: "20 km/h" }]} />
      </DetailSheet>,
    );
    expect(tree.getByText("Wind")).toBeTruthy();
    expect(tree.getByText("12 km/h E")).toBeTruthy();
    expect(tree.getByText("Steady.")).toBeTruthy();
    expect(tree.getByText("Wind is air moving.")).toBeTruthy();
    expect(tree.getByLabelText("Gusts: 20 km/h")).toBeTruthy();
    // Section headings are VoiceOver headers.
    expect(tree.getAllByRole("header").map((h) => h.props.children)).toEqual([
      "Wind",
      "Next 24 hours",
    ]);
  });

  it("holds VoiceOver inside, is the system page sheet, and closes by back or swipe", async () => {
    const onClose = jest.fn();
    const tree = await render(
      <DetailSheet open title="Wind" onClose={onClose} testID="sheet">
        <Text>inside</Text>
      </DetailSheet>,
    );
    const modal = tree.getByTestId("sheet");
    expect(modal.props.presentationStyle).toBe("pageSheet");
    modal.props.onRequestClose();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(tree.toJSON())).toContain(
      '"accessibilityViewIsModal":true',
    );
  });

  it("has a Close button at least 48 dp tall (56 by default)", async () => {
    const onClose = jest.fn();
    const tree = await render(
      <DetailSheet open title="Wind" onClose={onClose}>
        <Text>inside</Text>
      </DetailSheet>,
    );
    const close = tree.getByLabelText(/^Close/);
    const style = StyleSheet.flatten(close.props.style) as {
      minHeight: number;
    };
    expect(style.minHeight).toBeGreaterThanOrEqual(TOUCH.min);
    await fireEvent.press(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("DetailSheet for a task (the activity and report sheets)", () => {
  it("says what it is for under the title, and pins a footer under the body", async () => {
    const tree = await render(
      <DetailSheet
        open
        title="Choose activities"
        description="Pick what you follow the weather for."
        onClose={jest.fn()}
        footer={<Text>Done now</Text>}
      >
        <Text>list</Text>
      </DetailSheet>,
    );
    expect(
      tree.getByText("Pick what you follow the weather for."),
    ).toBeTruthy();
    expect(tree.getByText("Done now")).toBeTruthy();
    expect(tree.getByText("list")).toBeTruthy();
  });

  it("hands a sheet a way to scroll its body, and takes it back on close", async () => {
    const scrollToRef: {
      current: ((y: number, animated: boolean) => void) | null;
    } = { current: null };
    const tree = await render(
      <DetailSheet
        open
        title="My activities"
        onClose={jest.fn()}
        scrollToRef={scrollToRef}
      >
        <Text>cards</Text>
      </DetailSheet>,
    );
    expect(typeof scrollToRef.current).toBe("function");
    await tree.rerender(
      <DetailSheet
        open={false}
        title="My activities"
        onClose={jest.fn()}
        scrollToRef={scrollToRef}
      >
        <Text>cards</Text>
      </DetailSheet>,
    );
    expect(scrollToRef.current).toBeNull();
  });
});

describe("InsightCard as a button", () => {
  const icon = () => null;

  it("is one button with its spoken label and a hint when it opens something", async () => {
    const onPress = jest.fn();
    const tree = await render(
      <InsightCard
        label="Wind"
        mineral="cobalt"
        icon={icon}
        summary="10 kilometres per hour"
        sentence="Calm."
        onPress={onPress}
      >
        <Text>dial</Text>
      </InsightCard>,
    );
    const card = tree.getByLabelText("Wind. 10 kilometres per hour. Calm.");
    expect(card.props.accessibilityRole).toBe("button");
    expect(card.props.accessibilityHint).toBe("Opens details");
    await fireEvent.press(card);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("is a plain readable card when it opens nothing", async () => {
    const tree = await render(
      <InsightCard label="Wind" mineral="cobalt" icon={icon} sentence="Calm.">
        <Text>dial</Text>
      </InsightCard>,
    );
    const card = tree.getByLabelText("Wind. Calm.");
    expect(card.props.accessibilityRole).toBeUndefined();
    expect(card.props.accessibilityHint).toBeUndefined();
  });
});
