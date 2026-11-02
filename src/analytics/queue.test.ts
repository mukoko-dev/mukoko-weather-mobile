/**
 * The on-device event queue: the cap, persistence across restarts, opt-out,
 * install-id reset, no free text at runtime, and batching to our own API only
 * when an uploader exists (it does not in the app yet).
 */

import { randomUUID } from "node:crypto";

import { setAuthTokenResolver } from "@/api/client";
import { mockFetch } from "@/api/mock-fetch";
import {
  __resetEventQueueForTests,
  coarsePlace,
  createApiUploader,
  EVENTS_UPLOAD_ENABLED,
  getEventQueue,
  type EventProps,
} from "@/analytics";
import {
  EventQueue,
  MAX_BATCH,
  type EventBatch,
  type QueueStorage,
  type SendResult,
  type Uploader,
} from "@/analytics/queue";

function memoryStorage(initial: string | null = null) {
  const box = { value: initial, writes: 0 };
  const storage: QueueStorage = {
    read: async () => box.value,
    write: async (value) => {
      box.value = value;
      box.writes += 1;
    },
  };
  return { box, storage };
}

const CLIENT = {
  app: "mukoko-weather",
  platform: "ios",
  version: "1.0.0",
} as const;

function makeQueue(
  storage: QueueStorage,
  extra: Partial<ConstructorParameters<typeof EventQueue>[0]> = {},
) {
  return new EventQueue({
    storage,
    newId: () => randomUUID(),
    client: CLIENT,
    now: () => new Date("2026-11-02T08:15:30Z"),
    ...extra,
  });
}

const HARARE = coarsePlace({ lat: -17.83, lon: 31.05, country: "ZW" });

describe("EventQueue", () => {
  it("keeps a valid event and finds it again after a restart", async () => {
    const { storage } = memoryStorage();
    const first = makeQueue(storage);
    expect(
      await first.track("place_saved", {
        method: "search",
        savedCount: 1,
        place: HARARE,
      }),
    ).toBe(true);
    await first.settled();

    const second = makeQueue(storage);
    await second.load();
    const state = second.snapshot();
    expect(state.installId).toBe(first.snapshot().installId);
    expect(state.events).toEqual([
      {
        name: "place_saved",
        at: "2026-11-02T08:15:00.000Z",
        props: { method: "search", savedCount: 1, place: HARARE },
      },
    ]);
  });

  it("caps the queue, dropping the oldest event but keeping first_open", async () => {
    const { storage } = memoryStorage();
    const q = makeQueue(storage, { cap: 3 });
    await q.recordAppOpen();
    for (const surface of ["place", "forecast", "app"] as const) {
      await q.track("share", { surface });
    }
    const names = q.snapshot().events.map((e) => [e.name, e.props]);
    expect(names).toEqual([
      ["first_open", { origin: "install" }],
      ["share", { surface: "forecast" }],
      ["share", { surface: "app" }],
    ]);
  });

  it("drops free text at runtime, whatever the caller's types say", async () => {
    const q = makeQueue(memoryStorage().storage);
    const sneaky = { surface: "home", query: "123 Main Road" } as unknown;
    expect(
      await q.track("forecast_shown", sneaky as EventProps["forecast_shown"]),
    ).toBe(false);
    expect(
      await q.track("share", {
        surface: "my farm" as unknown as "app",
      }),
    ).toBe(false);
    expect(q.snapshot().events).toEqual([]);
  });

  it("records first_open once per install id, across restarts", async () => {
    const { storage } = memoryStorage();
    const a = makeQueue(storage);
    await Promise.all([a.recordAppOpen(), a.recordAppOpen()]);
    await a.settled();
    const b = makeQueue(storage);
    await b.recordAppOpen();
    expect(
      b.snapshot().events.filter((e) => e.name === "first_open"),
    ).toHaveLength(1);
  });

  it("records forecast_shown once per surface, place and day", async () => {
    let now = new Date("2026-11-02T08:00:00Z");
    const q = makeQueue(memoryStorage().storage, { now: () => now });
    expect(
      await q.track("forecast_shown", { surface: "home", place: HARARE }),
    ).toBe(true);
    expect(
      await q.track("forecast_shown", { surface: "home", place: HARARE }),
    ).toBe(false);
    expect(
      await q.track("forecast_shown", { surface: "place", place: HARARE }),
    ).toBe(true);
    now = new Date("2026-11-03T08:00:00Z");
    expect(
      await q.track("forecast_shown", { surface: "home", place: HARARE }),
    ).toBe(true);
  });

  describe("opt-out", () => {
    it("drops what is queued and records nothing more, across restarts", async () => {
      const { box, storage } = memoryStorage();
      const q = makeQueue(storage);
      await q.recordAppOpen();
      await q.track("share", { surface: "app" });
      await q.setOptOut(true);
      expect(await q.track("share", { surface: "app" })).toBe(false);
      await q.recordAppOpen();
      await q.settled();

      expect(q.snapshot()).toMatchObject({
        optOut: true,
        installId: null,
        events: [],
      });
      // Nothing about the person stays on the phone.
      expect(box.value).not.toMatch(/share|first_open/);

      const restarted = makeQueue(storage);
      expect(await restarted.track("share", { surface: "app" })).toBe(false);
      expect(restarted.snapshot().events).toEqual([]);
    });

    it("opting back in starts a new id, never the old one", async () => {
      const q = makeQueue(memoryStorage().storage);
      await q.load();
      const before = q.snapshot().installId;
      await q.setOptOut(true);
      await q.setOptOut(false);
      const after = q.snapshot();
      expect(after.installId).not.toBe(before);
      expect(after.events.map((e) => [e.name, e.props])).toEqual([
        ["first_open", { origin: "reset" }],
      ]);
    });

    it("asks the API to forget an id it has already received", async () => {
      const uploader = fakeUploader(["ok"]);
      const q = makeQueue(memoryStorage().storage, { uploader });
      await q.track("share", { surface: "app" });
      await q.flush();
      const sentId = uploader.batches[0].installId;

      await q.setOptOut(true);
      expect(q.snapshot().forget).toEqual([sentId]);
      await q.flush();
      expect(uploader.forgotten).toEqual([sentId]);
      expect(q.snapshot().forget).toEqual([]);
      expect(uploader.batches).toHaveLength(1);
    });
  });

  it("reset gives a new id, clears the queue, and forgets only a sent id", async () => {
    const q = makeQueue(memoryStorage().storage);
    await q.recordAppOpen();
    await q.track("share", { surface: "app" });
    const old = q.snapshot().installId;
    await q.resetInstallId();
    const state = q.snapshot();
    expect(state.installId).not.toBe(old);
    // Never sent, so the API has nothing to forget.
    expect(state.forget).toEqual([]);
    expect(state.events.map((e) => e.name)).toEqual(["first_open"]);
  });

  it("starts fresh from a corrupt or failing store, and never throws", async () => {
    const corrupt = makeQueue(memoryStorage("{not json").storage);
    expect(await corrupt.track("share", { surface: "app" })).toBe(true);

    const failing = makeQueue({
      read: async () => {
        throw new Error("disk");
      },
      write: async () => {
        throw new Error("disk full");
      },
    });
    expect(await failing.track("share", { surface: "app" })).toBe(true);
    await expect(failing.settled()).resolves.toBeUndefined();
  });

  it("drops stored events that no longer validate", async () => {
    const stored = JSON.stringify({
      v: 1,
      installId: randomUUID(),
      optOut: false,
      events: [
        {
          name: "share",
          at: "2026-11-02T08:00:00Z",
          props: { surface: "app" },
        },
        {
          name: "share",
          at: "2026-11-02T08:00:00Z",
          props: { surface: "a note" },
        },
        { name: "typed", at: "2026-11-02T08:00:00Z", props: {} },
      ],
    });
    const q = makeQueue(memoryStorage(stored).storage);
    await q.load();
    expect(q.snapshot().events).toHaveLength(1);
  });

  describe("flush", () => {
    it("sends nothing without an uploader", async () => {
      const q = makeQueue(memoryStorage().storage);
      await q.track("share", { surface: "app" });
      expect(await q.flush()).toEqual({ sent: 0 });
      expect(q.snapshot().events).toHaveLength(1);
    });

    it("sends batches of at most 100 and keeps what failed", async () => {
      const uploader = fakeUploader(["ok", "retry"]);
      const q = makeQueue(memoryStorage().storage, { uploader, cap: 500 });
      for (let i = 0; i < 150; i++)
        await q.track("push_enabled", { granted: i % 2 === 0 });
      expect(await q.flush()).toEqual({ sent: MAX_BATCH });
      expect(uploader.batches.map((b) => b.events.length)).toEqual([100, 50]);
      expect(q.snapshot().events).toHaveLength(50);
      const batch = uploader.batches[0];
      expect(batch).toMatchObject({ schema: 1, client: CLIENT });
      expect(batch.installId).toBe(q.snapshot().installId);
    });

    it("drops a batch the API refuses as invalid", async () => {
      const uploader = fakeUploader(["drop"]);
      const q = makeQueue(memoryStorage().storage, { uploader });
      await q.track("share", { surface: "app" });
      expect(await q.flush()).toEqual({ sent: 0 });
      expect(q.snapshot().events).toEqual([]);
    });
  });
});

describe("the app's queue", () => {
  afterEach(() => {
    __resetEventQueueForTests();
    setAuthTokenResolver(null);
  });

  it("does not send anything: the route does not exist yet", async () => {
    expect(EVENTS_UPLOAD_ENABLED).toBe(false);
    const calls = mockFetch();
    const q = getEventQueue();
    await q.track("share", { surface: "app" });
    expect(await q.flush()).toEqual({ sent: 0 });
    expect(calls).toHaveLength(0);
  });

  it("would post to our own API, without the sign-in token", async () => {
    setAuthTokenResolver(async () => "session-token");
    const calls = mockFetch(
      { status: 202, body: { accepted: 1 } },
      { status: 400 },
      { status: 503 },
    );
    const uploader = createApiUploader();
    const batch: EventBatch = {
      schema: 1,
      installId: randomUUID(),
      batchId: randomUUID(),
      sentAt: "2026-11-02T08:15:30.000Z",
      client: CLIENT,
      events: [],
    };
    expect(await uploader.send(batch)).toBe("ok");
    expect(await uploader.send(batch)).toBe("drop");
    expect(await uploader.send(batch)).toBe("retry");
    expect(calls[0].url).toBe("https://weather-api.mukoko.com/v1/events");
    expect(calls[0].method).toBe("POST");
    expect(calls[0].headers.authorization).toBeUndefined();
    expect(calls[0].body).toEqual(batch);
  });
});

function fakeUploader(results: SendResult[]) {
  const queue = [...results];
  const batches: EventBatch[] = [];
  const forgotten: string[] = [];
  const uploader: Uploader & { batches: EventBatch[]; forgotten: string[] } = {
    batches,
    forgotten,
    async send(batch) {
      batches.push(batch);
      return queue.shift() ?? "retry";
    },
    async forget(id) {
      forgotten.push(id);
      return "ok";
    },
  };
  return uploader;
}
