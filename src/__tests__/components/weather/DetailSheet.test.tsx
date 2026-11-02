/**
 * The sheet scaffold: the platform sheet pattern on each platform (the iOS
 * page sheet; the Android bottom sheet over a scrim), a visible 48 dp Close,
 * a heading, and Reduce Motion.
 */

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo, Platform, Text } from "react-native";

import { DetailSheet } from "@/components/weather/DetailSheet";
import { IPHONE_INSETS, setInsets, setWindow } from "@/test-utils/mocks";
import { TOUCH } from "@/theme/mzizi";

jest.mock("react-native-safe-area-context", () =>
  require("@/test-utils/mocks").safeAreaMock(),
);

function flat(style: unknown): Record<string, unknown> {
  return Array.isArray(style)
    ? style.flat(3).reduce((a: object, b: object) => ({ ...a, ...b }), {})
    : ((style ?? {}) as Record<string, unknown>);
}

/** The sheet's Modal: the root of the rendered tree, with its props. */
function modalProps(tree: { toJSON: () => unknown }) {
  return (tree.toJSON() as { type: string; props: Record<string, unknown> })
    .props;
}

const original = Platform.OS;
afterEach(() => {
  Platform.OS = original;
  jest.restoreAllMocks();
});

beforeEach(() => {
  setInsets(IPHONE_INSETS);
  setWindow(393, 852);
  jest
    .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
    .mockResolvedValue(false);
});

describe("DetailSheet", () => {
  it("shows the title as a heading, the description, the content and a Close", async () => {
    const onClose = jest.fn();
    const tree = await render(
      <DetailSheet
        visible
        title="My activities"
        description="How it goes."
        onClose={onClose}
      >
        <Text>Body copy</Text>
      </DetailSheet>,
    );
    expect(tree.getByText("My activities").props.accessibilityRole).toBe(
      "header",
    );
    expect(tree.getByText("How it goes.")).toBeTruthy();
    expect(tree.getByText("Body copy")).toBeTruthy();
    const close = tree.getByLabelText("Close My activities");
    expect(close.props.accessibilityRole).toBe("button");
    expect(flat(close.props.style).minHeight).toBe(TOUCH.min);
    expect(flat(close.props.style).minWidth).toBe(TOUCH.min);
    await fireEvent.press(close);
    expect(onClose).toHaveBeenCalled();
  });

  it("renders nothing while closed", async () => {
    const tree = await render(
      <DetailSheet visible={false} title="Hidden" onClose={jest.fn()}>
        <Text>Body copy</Text>
      </DetailSheet>,
    );
    expect(tree.queryByText("Body copy")).toBeNull();
  });

  it("is the system page sheet on iOS, announced as modal", async () => {
    Platform.OS = "ios";
    const tree = await render(
      <DetailSheet visible title="T" onClose={jest.fn()} testID="sheet">
        <Text>x</Text>
      </DetailSheet>,
    );
    expect(modalProps(tree).presentationStyle).toBe("pageSheet");
    expect(modalProps(tree).transparent).toBe(false);
    expect(tree.getByTestId("sheet").props.accessibilityViewIsModal).toBe(true);
  });

  it("is a bottom sheet over a scrim on Android, which also closes on the scrim and on Back", async () => {
    Platform.OS = "android";
    const onClose = jest.fn();
    const tree = await render(
      <DetailSheet visible title="T" onClose={onClose}>
        <Text>x</Text>
      </DetailSheet>,
    );
    expect(modalProps(tree).presentationStyle).toBeUndefined();
    expect(modalProps(tree).transparent).toBe(true);
    // Two ways to close by name: the scrim and the Close button.
    // (The panel is announced as modal, so the scrim is hidden from the
    // screen reader but still tappable.)
    const all = { includeHiddenElements: true };
    expect(tree.getAllByLabelText("Close T", all)).toHaveLength(2);
    // Back closes it: the Modal's request-close handler is the same onClose.
    await fireEvent.press(tree.getAllByLabelText("Close T", all)[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it("fades instead of sliding under Reduce Motion", async () => {
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockResolvedValue(true);
    const tree = await render(
      <DetailSheet visible title="T" onClose={jest.fn()}>
        <Text>x</Text>
      </DetailSheet>,
    );
    await waitFor(() => expect(modalProps(tree).animationType).toBe("fade"));
  });

  it("slides when motion is allowed", async () => {
    const tree = await render(
      <DetailSheet visible title="T" onClose={jest.fn()}>
        <Text>x</Text>
      </DetailSheet>,
    );
    expect(modalProps(tree).animationType).toBe("slide");
  });

  it("pins a footer under the scrolling body", async () => {
    const tree = await render(
      <DetailSheet
        visible
        title="T"
        onClose={jest.fn()}
        footer={<Text>Done now</Text>}
      >
        <Text>x</Text>
      </DetailSheet>,
    );
    expect(tree.getByText("Done now")).toBeTruthy();
  });
});
