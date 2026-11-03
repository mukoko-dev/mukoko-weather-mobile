import { FLAGS, isFeatureEnabled } from "./feature-flags";

describe("feature flags", () => {
  it("keeps Shamwari paused, as on the web", () => {
    expect(FLAGS.shamwari_chat).toBe(false);
    expect(isFeatureEnabled("shamwari_chat")).toBe(false);
  });
});
