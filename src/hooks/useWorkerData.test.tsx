/**
 * The card loader: three outcomes, an answer that belongs to its inputs, and a
 * refresh that asks again without blanking what the card already shows.
 */

import { act, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { useWorkerData } from "./useWorkerData";

type Load = (signal: AbortSignal) => Promise<string>;

function Probe({
  load,
  refreshKey,
  enabled = true,
}: {
  load: Load;
  refreshKey?: unknown;
  enabled?: boolean;
}) {
  const s = useWorkerData<string>(load, enabled, refreshKey);
  return (
    <>
      <Text testID="out">
        {s.status === "ready" ? `ready:${s.data}` : s.status}
      </Text>
      <Text testID="retry" onPress={s.reload}>
        retry
      </Text>
    </>
  );
}

/** A load the test settles by hand. */
function deferred() {
  let resolve!: (v: string) => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<string>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function settle() {
  await act(async () => {
    await Promise.resolve();
  });
}

const text = (tree: Awaited<ReturnType<typeof render>>) =>
  tree.getByTestId("out").props.children;

describe("useWorkerData", () => {
  it("goes from loading to ready, or to unavailable when the load fails", async () => {
    const ok = deferred();
    const tree = await render(<Probe load={() => ok.promise} />);
    expect(text(tree)).toBe("loading");
    ok.resolve("a");
    await settle();
    expect(text(tree)).toBe("ready:a");

    const bad = await render(
      <Probe load={() => Promise.reject(new Error("down"))} />,
    );
    await settle();
    expect(text(bad)).toBe("unavailable");
  });

  it("asks nothing while it is not enabled", async () => {
    const load = jest.fn(async () => "x");
    const tree = await render(<Probe load={load} enabled={false} />);
    await settle();
    expect(load).not.toHaveBeenCalled();
    expect(text(tree)).toBe("loading");
  });

  it("is loading again at once when the inputs change, never showing the last place's answer", async () => {
    const first: Load = async () => "harare";
    const second = deferred();
    const tree = await render(<Probe load={first} />);
    await settle();
    expect(text(tree)).toBe("ready:harare");

    // A new `load` function is a new place: the old answer goes immediately.
    const next: Load = () => second.promise;
    await tree.rerender(<Probe load={next} />);
    expect(text(tree)).toBe("loading");
    second.resolve("bulawayo");
    await settle();
    expect(text(tree)).toBe("ready:bulawayo");
  });

  it("refreshes on a new refresh key and keeps the answer on screen while it does", async () => {
    let n = 0;
    const pending = [deferred(), deferred()];
    const load: Load = () => pending[n++].promise;
    const tree = await render(<Probe load={load} refreshKey="one" />);
    pending[0].resolve("old");
    await settle();
    expect(text(tree)).toBe("ready:old");

    await tree.rerender(<Probe load={load} refreshKey="two" />);
    // The new request is in flight; the card still shows what it had.
    expect(n).toBe(2);
    expect(text(tree)).toBe("ready:old");
    pending[1].resolve("new");
    await settle();
    expect(text(tree)).toBe("ready:new");

    // The same key again asks nothing.
    await tree.rerender(<Probe load={load} refreshKey="two" />);
    expect(n).toBe(2);
  });

  it("keeps what it has when a refresh fails, and says unavailable when it has nothing", async () => {
    let n = 0;
    const pending = [deferred(), deferred()];
    const load: Load = () => pending[n++].promise;
    const tree = await render(<Probe load={load} refreshKey="one" />);
    pending[0].resolve("old");
    await settle();
    await tree.rerender(<Probe load={load} refreshKey="two" />);
    pending[1].reject(new Error("offline"));
    await settle();
    expect(text(tree)).toBe("ready:old");
  });

  it("Try again starts from loading and asks again", async () => {
    let n = 0;
    const pending = [deferred(), deferred()];
    const load: Load = () => pending[n++].promise;
    const tree = await render(<Probe load={load} />);
    pending[0].reject(new Error("down"));
    await settle();
    expect(text(tree)).toBe("unavailable");

    await act(async () => {
      tree.getByTestId("retry").props.onPress();
    });
    expect(text(tree)).toBe("loading");
    pending[1].resolve("back");
    await settle();
    expect(text(tree)).toBe("ready:back");
    expect(n).toBe(2);
  });
});
