/**
 * The opt-out switch: off drops the queue and records nothing more; on again
 * starts a new anonymous id; reset gives a new id.
 */

import { randomUUID } from "node:crypto";
import { fireEvent, render } from "@testing-library/react-native";

import { EventQueue } from "@/analytics/queue";
import { AnalyticsSection } from "@/components/settings/AnalyticsSection";

let mockQueue: EventQueue;
jest.mock("@/analytics", () => ({
  getEventQueue: () => mockQueue,
  setAnalyticsOptOut: (optOut: boolean) => mockQueue.setOptOut(optOut),
  resetAnalyticsId: () => mockQueue.resetInstallId(),
}));

function memoryQueue() {
  let value: string | null = null;
  return new EventQueue({
    storage: {
      read: async () => value,
      write: async (v) => {
        value = v;
      },
    },
    newId: () => randomUUID(),
    client: { app: "mukoko-weather", platform: "ios", version: "1.0.0" },
  });
}

describe("AnalyticsSection", () => {
  beforeEach(() => {
    mockQueue = memoryQueue();
  });

  it("turning sharing off drops the queue and records nothing more", async () => {
    await mockQueue.track("share", { surface: "app" });
    const screen = await render(<AnalyticsSection />);
    const toggle = await screen.findByLabelText("Share anonymous usage");
    await screen.findByLabelText("Reset anonymous id"); // loaded: sharing on

    await fireEvent(toggle, "valueChange", false);

    expect(mockQueue.snapshot()).toMatchObject({ optOut: true, events: [] });
    expect(await mockQueue.track("share", { surface: "app" })).toBe(false);
    expect(screen.queryByLabelText("Reset anonymous id")).toBeNull();
  });

  it("turning it back on starts a new id", async () => {
    await mockQueue.load();
    const before = mockQueue.snapshot().installId;
    await mockQueue.setOptOut(true);
    const screen = await render(<AnalyticsSection />);
    const toggle = await screen.findByLabelText("Share anonymous usage");

    await fireEvent(toggle, "valueChange", true);

    const after = mockQueue.snapshot();
    expect(after.optOut).toBe(false);
    expect(after.installId).not.toBe(before);
  });

  it("reset gives a new id", async () => {
    await mockQueue.load();
    const before = mockQueue.snapshot().installId;
    const screen = await render(<AnalyticsSection />);
    await fireEvent.press(await screen.findByLabelText("Reset anonymous id"));
    expect(mockQueue.snapshot().installId).not.toBe(before);
    expect(screen.getByText(/anonymous id is new/)).toBeTruthy();
  });
});
