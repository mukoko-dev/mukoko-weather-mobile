/**
 * The on-device event queue: events wait here, on the phone, until the weather
 * API has a route to take them (`POST /v1/events`, proposed in
 * mukoko-dev/mukoko-weather#438; see `./index.ts`). No analytics SDK, no third
 * party: when the route exists, the queue is sent to our own API in batches.
 *
 * Rules it keeps:
 *   - only events that pass `validateEvent` are kept (no free text);
 *   - a cap (oldest dropped first, the first_open event kept);
 *   - opt-out drops every queued event, records nothing more, and forgets the
 *     install id (the API is asked to delete what it holds for an id it has
 *     seen);
 *   - the install id is random, belongs to the analytics alone (not the device
 *     id), and the person can reset it, which clears the queue as well;
 *   - forecast_shown is recorded once per surface, place and UTC day.
 *
 * The whole state is one small JSON document, written after every change.
 * Storage and upload are injected, so the tests run in memory.
 */

import {
  minuteStamp,
  validateEvent,
  type AppEvent,
  type EventName,
  type EventProps,
} from "@/analytics/events";

/** Where the queue lives. Errors are swallowed by the queue. */
export type QueueStorage = {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
};

/** Who sends: one batch per request. */
export type ClientInfo = {
  app: "mukoko-weather";
  platform: "ios" | "android" | "web";
  version: string;
};

/** The body of `POST /v1/events`. */
export type EventBatch = {
  schema: 1;
  installId: string;
  /** Lets the API ignore a batch it already stored (a retried request). */
  batchId: string;
  sentAt: string;
  client: ClientInfo;
  events: AppEvent[];
};

/**
 * How a batch went: `ok` (stored), `drop` (the API refused it as invalid;
 * sending it again would fail again) or `retry` (offline, rate-limited, down).
 */
export type SendResult = "ok" | "drop" | "retry";

export type Uploader = {
  send(batch: EventBatch): Promise<SendResult>;
  /** Ask the API to delete everything it holds for `installId`. */
  forget(installId: string): Promise<"ok" | "retry">;
};

export type QueueState = {
  v: 1;
  /** Null while opted out. */
  installId: string | null;
  /** How the current id came about: a new install, or a reset / opt-in. */
  idOrigin: "install" | "reset";
  /** The install id the first_open event was recorded for. */
  firstOpenFor: string | null;
  optOut: boolean;
  /** Whether any batch has been stored by the API under the current id. */
  uploaded: boolean;
  events: AppEvent[];
  /** Ids the API has seen and must be asked to delete. */
  forget: string[];
  /**
   * The forecast_shown keys recorded today (`day|surface|place`), kept apart
   * from `events` so the once-a-day rule survives an upload.
   */
  shown: string[];
};

/** Most events kept on the phone. About 100 bytes each. */
export const DEFAULT_QUEUE_CAP = 500;
/** Most events in one request. */
export const MAX_BATCH = 100;
/** Most ids waiting to be forgotten (a person resetting over and over). */
const MAX_FORGET = 10;
/** Most forecast_shown keys remembered for one day. */
const MAX_SHOWN = 50;

function emptyState(installId: string | null): QueueState {
  return {
    v: 1,
    installId,
    idOrigin: "install",
    firstOpenFor: null,
    optOut: false,
    uploaded: false,
    events: [],
    forget: [],
    shown: [],
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Rebuild a stored state, keeping only what still validates. */
function parseState(raw: string | null): QueueState | null {
  if (!raw) return null;
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!input || typeof input !== "object") return null;
  const s = input as Record<string, unknown>;
  if (s.v !== 1) return null;
  const id = (value: unknown) =>
    typeof value === "string" && UUID_RE.test(value) ? value : null;

  const optOut = s.optOut === true;
  const installId = optOut ? null : id(s.installId);
  if (!optOut && !installId) return null;

  const events: AppEvent[] = [];
  for (const e of Array.isArray(s.events) ? s.events : []) {
    if (!e || typeof e !== "object") continue;
    const ev = e as Record<string, unknown>;
    const checked = validateEvent(ev.name, ev.props);
    if (!checked || typeof ev.at !== "string") continue;
    if (Number.isNaN(Date.parse(ev.at))) continue;
    events.push({
      name: checked.name,
      at: minuteStamp(new Date(ev.at)),
      props: checked.props as EventProps[EventName],
    });
  }
  const shown = (Array.isArray(s.shown) ? s.shown : [])
    .filter((k): k is string => typeof k === "string" && k.length <= 80)
    .slice(-MAX_SHOWN);
  const forget = (Array.isArray(s.forget) ? s.forget : [])
    .map(id)
    .filter((v): v is string => v !== null)
    .slice(-MAX_FORGET);

  return {
    v: 1,
    installId,
    idOrigin: s.idOrigin === "reset" ? "reset" : "install",
    firstOpenFor: id(s.firstOpenFor),
    optOut,
    uploaded: s.uploaded === true,
    events,
    forget,
    shown,
  };
}

/**
 * The state to start from when a stored document exists but cannot be used.
 * If it says the person opted out, that holds: a damaged file must never turn
 * measurement back on.
 */
function recoverState(raw: string, newId: () => string): QueueState {
  return /"optOut"\s*:\s*true/.test(raw)
    ? { ...emptyState(null), optOut: true }
    : emptyState(newId());
}

/** The once-a-day key of a forecast_shown event. */
function shownKey(event: AppEvent): string {
  const props = event.props as EventProps["forecast_shown"];
  const place = props.place ?? {};
  // The cell alone when there is one: whether the country came along with
  // it (it depends on the payload) must not make it a different place.
  return [
    event.at.slice(0, 10),
    props.surface,
    place.cell ?? place.country ?? "",
  ].join("|");
}

export type EventQueueOptions = {
  storage: QueueStorage;
  /** A fresh random install id (UUID v4). */
  newId: () => string;
  client: ClientInfo;
  /** Null: nothing is ever sent (the route does not exist yet). */
  uploader?: Uploader | null;
  now?: () => Date;
  cap?: number;
};

export class EventQueue {
  private state: QueueState = emptyState(null);
  private loading: Promise<void> | null = null;
  /** Set when storage could not be read: nothing is recorded or written. */
  private readOnly = false;
  private writing: Promise<void> = Promise.resolve();
  /** The newest state not yet on disk; writes coalesce to it. */
  private pending: string | null = null;
  private flushing: Promise<{ sent: number }> | null = null;
  private readonly storage: QueueStorage;
  private readonly newId: () => string;
  private readonly client: ClientInfo;
  private readonly uploader: Uploader | null;
  private readonly now: () => Date;
  private readonly cap: number;

  constructor(opts: EventQueueOptions) {
    this.storage = opts.storage;
    this.newId = opts.newId;
    this.client = opts.client;
    this.uploader = opts.uploader ?? null;
    this.now = opts.now ?? (() => new Date());
    this.cap = Math.max(1, opts.cap ?? DEFAULT_QUEUE_CAP);
  }

  /**
   * Read the stored queue (once it succeeds; later calls await the same read).
   * A failed read is tried again on the next call.
   */
  load(): Promise<void> {
    if (!this.loading) {
      this.loading = (async () => {
        let raw: string | null;
        try {
          raw = await this.storage.read();
        } catch {
          // Unreadable this time (locked, busy): record nothing and write
          // nothing until a read works, so a stored opt-out is never
          // overwritten.
          this.state = { ...emptyState(null), optOut: true };
          this.readOnly = true;
          this.loading = null;
          return;
        }
        this.readOnly = false;
        const stored = parseState(raw);
        this.state =
          stored ??
          (raw ? recoverState(raw, this.newId) : null) ??
          emptyState(this.newId());
        if (!stored) void this.persist().catch(() => {});
      })();
    }
    return this.loading;
  }

  /**
   * Whether the stored choice could be read. When false, nothing is recorded
   * and a settings screen should say the choice is unavailable, not "off".
   */
  available(): boolean {
    return !this.readOnly;
  }

  /** A copy of the current state (for tests and a settings screen). */
  snapshot(): QueueState {
    return JSON.parse(JSON.stringify(this.state)) as QueueState;
  }

  /**
   * Record an event. Returns whether it was kept: false when opted out, when
   * it fails validation, or when it repeats today's forecast_shown.
   */
  async track<K extends EventName>(
    name: K,
    props: EventProps[K],
  ): Promise<boolean> {
    await this.load();
    if (this.state.optOut || !this.state.installId) {
      // An opt-out whose write failed is written again at the next chance.
      if (this.pending !== null) void this.persist().catch(() => {});
      return false;
    }
    const checked = validateEvent(name, props);
    if (!checked) {
      if (__DEV__) {
        console.warn(`[analytics] dropped an invalid ${String(name)} event`);
      }
      return false;
    }
    const event: AppEvent = {
      name: checked.name,
      at: minuteStamp(this.now()),
      props: checked.props as EventProps[EventName],
    };
    let shown = this.state.shown;
    if (event.name === "forecast_shown") {
      const key = shownKey(event);
      if (shown.includes(key)) return false;
      const today = key.slice(0, 10);
      shown = [...shown.filter((k) => k.startsWith(today)), key].slice(
        -MAX_SHOWN,
      );
    }
    const events = [...this.state.events, event];
    while (events.length > this.cap) {
      const oldest = events.findIndex((e) => e.name !== "first_open");
      events.splice(oldest === -1 ? 0 : oldest, 1);
    }
    this.state = { ...this.state, events, shown };
    void this.persist().catch(() => {});
    return true;
  }

  /** first_open, once per install id. Call on every cold start. */
  async recordAppOpen(): Promise<void> {
    await this.load();
    const { installId, firstOpenFor, idOrigin, optOut } = this.state;
    if (optOut || !installId || firstOpenFor === installId) return;
    // Mark before tracking so two quick calls never record it twice.
    this.state = { ...this.state, firstOpenFor: installId };
    const kept = await this.track("first_open", { origin: idOrigin });
    if (!kept) this.state = { ...this.state, firstOpenFor };
    void this.persist().catch(() => {});
  }

  /**
   * Turn analytics off (drop the queue, forget the id) or back on (a new id:
   * nothing links the person before and after). Resolves once the choice is
   * on disk; rejects if it could not be written, so the screen can say so.
   */
  async setOptOut(optOut: boolean): Promise<void> {
    await this.load();
    if (this.readOnly) throw new Error("Analytics storage is unavailable.");
    if (this.state.optOut === optOut) {
      // Asked again after a failed write: try to write the choice again.
      if (this.pending !== null) await this.persist();
      return;
    }
    if (optOut) {
      this.state = {
        ...emptyState(null),
        optOut: true,
        forget: this.withForgotten(),
      };
      await this.persist();
      return;
    }
    this.state = {
      ...emptyState(this.newId()),
      idOrigin: "reset",
      forget: this.state.forget,
    };
    await this.persist();
    await this.recordAppOpen();
  }

  /** A new install id, an empty queue, and the old id forgotten by the API. */
  async resetInstallId(): Promise<void> {
    await this.load();
    if (this.state.optOut) return;
    this.state = {
      ...emptyState(this.newId()),
      idOrigin: "reset",
      forget: this.withForgotten(),
    };
    await this.persist();
    await this.recordAppOpen();
  }

  /**
   * Send what is queued, in batches, and the pending forget requests. Does
   * nothing without an uploader. Stops at the first `retry`.
   */
  flush(): Promise<{ sent: number }> {
    if (!this.flushing) {
      this.flushing = this.doFlush().finally(() => {
        this.flushing = null;
      });
    }
    return this.flushing;
  }

  /** Wait for the last write (tests, and before the app is backgrounded). */
  settled(): Promise<void> {
    return this.writing.catch(() => {});
  }

  private async doFlush(): Promise<{ sent: number }> {
    await this.load();
    const uploader = this.uploader;
    if (!uploader) return { sent: 0 };

    for (const id of this.state.forget) {
      let result: "ok" | "retry" = "retry";
      try {
        result = await uploader.forget(id);
      } catch {
        // Offline: try again on the next flush.
      }
      // A failing forget request is retried next time; it never holds up the
      // current id's events, which are a different id.
      if (result !== "ok") break;
      this.state = {
        ...this.state,
        forget: this.state.forget.filter((f) => f !== id),
      };
      void this.persist().catch(() => {});
    }

    let sent = 0;
    while (!this.state.optOut && this.state.installId) {
      const chunk = this.state.events.slice(0, MAX_BATCH);
      if (chunk.length === 0) break;
      const batch: EventBatch = {
        schema: 1,
        installId: this.state.installId,
        batchId: this.newId(),
        sentAt: this.now().toISOString(),
        client: this.client,
        events: chunk,
      };
      let result: SendResult = "retry";
      try {
        result = await uploader.send(batch);
      } catch {
        // Offline: keep the events.
      }
      if (result === "retry") break;
      const done = new Set(chunk);
      const stillSameId = this.state.installId === batch.installId;
      this.state = {
        ...this.state,
        events: this.state.events.filter((e) => !done.has(e)),
        uploaded: this.state.uploaded || (result === "ok" && stillSameId),
        forget:
          result === "ok" && !stillSameId
            ? [...this.state.forget, batch.installId].slice(-MAX_FORGET)
            : this.state.forget,
      };
      void this.persist().catch(() => {});
      if (result === "ok") sent += chunk.length;
    }
    return { sent };
  }

  private withForgotten(): string[] {
    const { installId, uploaded, forget } = this.state;
    return installId && uploaded
      ? [...forget, installId].slice(-MAX_FORGET)
      : forget;
  }

  /**
   * Write the newest state. Writes run one after another and coalesce: a
   * write that finds a newer state waiting writes that one instead. Resolves
   * when this state (or a newer one) is on disk; rejects if the write failed.
   */
  private persist(): Promise<void> {
    if (this.readOnly) return Promise.resolve();
    this.pending = JSON.stringify(this.state);
    const run = this.writing
      .catch(() => {})
      .then(async () => {
        const value = this.pending;
        if (value === null) return;
        this.pending = null;
        try {
          await this.storage.write(value);
        } catch (err) {
          // Keep it for the next write, unless a newer state is waiting.
          if (this.pending === null) this.pending = value;
          throw err;
        }
      });
    this.writing = run.catch(() => {});
    return run;
  }
}
