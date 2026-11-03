/**
 * One copy of a place's reports, shared: one request however many parts ask,
 * never another place's list, and an upvote seen everywhere.
 */

import { act, renderHook, waitFor } from "@testing-library/react-native";

import { fetchReports, upvoteReport } from "@/api/reports";
import { type CommunityReport } from "@/shared/report-types";

import { clearReportsStore, useReports } from "./useReports";

jest.mock("@/api/reports", () => ({
  ...jest.requireActual("@/api/reports"),
  fetchReports: jest.fn(),
  upvoteReport: jest.fn(),
}));

const fetchMock = fetchReports as jest.MockedFunction<typeof fetchReports>;
const upvoteMock = upvoteReport as jest.MockedFunction<typeof upvoteReport>;

const report = (id: string, upvotes = 0) =>
  ({ id, upvotes }) as unknown as CommunityReport;

beforeEach(() => {
  jest.clearAllMocks();
  clearReportsStore();
});

describe("useReports", () => {
  it("asks once for a place however many parts show it", async () => {
    fetchMock.mockResolvedValue([report("a")]);
    const lane = await renderHook(() => useReports("harare", true));
    const card = await renderHook(() => useReports("harare", true));
    await waitFor(() => expect(card.result.current.status).toBe("ready"));
    expect(lane.result.current.reports).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never shows one place's reports under another", async () => {
    fetchMock.mockResolvedValueOnce([report("a"), report("b")]);
    const hook = await renderHook(
      ({ slug }: { slug: string | undefined }) => useReports(slug, true),
      { initialProps: { slug: "harare" as string | undefined } },
    );
    await waitFor(() => expect(hook.result.current.reports).toHaveLength(2));
    fetchMock.mockReturnValueOnce(new Promise(() => undefined));
    await hook.rerender({ slug: "bulawayo" });
    expect(hook.result.current.status).toBe("loading");
    expect(hook.result.current.reports).toHaveLength(0);
    await hook.rerender({ slug: undefined });
    expect(hook.result.current.status).toBe("off");
    expect(hook.result.current.reports).toHaveLength(0);
  });

  it("an upvote counted by the server shows in every part", async () => {
    fetchMock.mockResolvedValue([report("a", 2)]);
    upvoteMock.mockResolvedValue(true);
    const lane = await renderHook(() => useReports("harare", true));
    const card = await renderHook(() => useReports("harare", true));
    await waitFor(() => expect(card.result.current.status).toBe("ready"));
    await act(async () => {
      await card.result.current.upvote("a");
    });
    expect(lane.result.current.reports[0].upvotes).toBe(3);
  });

  it("reload asks again and keeps the list until the new one lands", async () => {
    fetchMock.mockResolvedValueOnce([report("a")]);
    const hook = await renderHook(() => useReports("harare", true));
    await waitFor(() => expect(hook.result.current.status).toBe("ready"));
    let land: (list: CommunityReport[]) => void = () => undefined;
    fetchMock.mockReturnValueOnce(new Promise((r) => (land = r)));
    await act(async () => hook.result.current.reload());
    expect(hook.result.current.status).toBe("ready");
    expect(hook.result.current.reports).toHaveLength(1);
    await act(async () => land([report("a"), report("new")]));
    expect(hook.result.current.reports).toHaveLength(2);
  });
});
