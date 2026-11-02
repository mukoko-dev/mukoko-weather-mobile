/**
 * The swipe frame mounts its gestures around the page inside the gesture
 * root (the native recognisers themselves can only be driven on a device).
 */

import "react-native-gesture-handler/jestSetup";
import { render } from "@testing-library/react-native";
import { ScrollView, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { SwipeFrame } from "@/components/shell/SwipeFrame";

describe("SwipeFrame", () => {
  it("renders the page and what sits over it", async () => {
    const tree = await render(
      <GestureHandlerRootView>
        <SwipeFrame
          swipe={{ activeOffsetX: [-12, 12], onSwipe: jest.fn() }}
          style={{ flex: 1 }}
          scroll={
            <ScrollView>
              <Text>page</Text>
            </ScrollView>
          }
        >
          <Text>scrim</Text>
        </SwipeFrame>
      </GestureHandlerRootView>,
    );
    expect(tree.getByText("page")).toBeTruthy();
    expect(tree.getByText("scrim")).toBeTruthy();
  });
});
