/** The rules every part reads: one part's successful retry fills the others. */

import { act, renderHook, waitFor } from "@testing-library/react-native";

import { loadSuitabilityRules } from "@/api/activities";
import { type SuitabilityRuleDoc } from "@/shared/suitability";

import { useSuitabilityRules } from "./useActivityData";

jest.mock("@/api/activities", () => ({
  ...jest.requireActual("@/api/activities"),
  loadSuitabilityRules: jest.fn(),
}));

const loadMock = loadSuitabilityRules as jest.MockedFunction<
  typeof loadSuitabilityRules
>;

const rule = { key: "activity:football" } as unknown as SuitabilityRuleDoc;

describe("useSuitabilityRules", () => {
  it("a part whose request failed fills when another part's retry succeeds", async () => {
    loadMock.mockRejectedValue(new Error("offline"));
    const hero = await renderHook(() => useSuitabilityRules(true));
    const lane = await renderHook(() => useSuitabilityRules(true));
    await waitFor(() => expect(hero.result.current.status).toBe("failed"));
    await waitFor(() => expect(lane.result.current.status).toBe("failed"));

    loadMock.mockResolvedValue([rule]);
    await act(async () => lane.result.current.retry());
    await waitFor(() => expect(lane.result.current.status).toBe("ready"));
    expect(hero.result.current.status).toBe("ready");
    expect(hero.result.current.rules?.has("activity:football")).toBe(true);
  });
});
