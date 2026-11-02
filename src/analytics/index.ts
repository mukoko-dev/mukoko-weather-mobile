/**
 * Measurement, through our own API only (mukoko-dev/mukoko-weather-mobile#54).
 *
 *   track("place_saved", { method: "search", savedCount: 2, place })
 *
 * Events are validated (`./events`) and queued on the phone (`./queue`). They
 * are not sent anywhere yet: `EVENTS_UPLOAD_ENABLED` stays false until the
 * weather API serves `POST /v1/events` (proposed in mukoko-dev/mukoko-weather)
 * AND the app shows the person the opt-out switch. The upload then goes to the
 * same Cloudflare host as every other call (`src/api/client.ts`), without the
 * sign-in token, so events never link to an account.
 *
 * No analytics SDK, no third party, no device fingerprint: a random install id
 * the person can reset, the platform and the app version, and coarse places.
 */

import * as Application from "expo-application";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";

import { ApiError, apiRequest } from "@/api/client";
import type { EventName, EventProps } from "@/analytics/events";
import {
  EventQueue,
  type ClientInfo,
  type EventBatch,
  type QueueStorage,
  type SendResult,
  type Uploader,
} from "@/analytics/queue";

export * from "@/analytics/events";

/**
 * The proposed ingest route on the weather API. It moves into `ROUTES` in
 * `src/api/client.ts` once the API serves it (the home slices are editing that
 * table now).
 */
export const EVENTS_ROUTE = "/v1/events";
/** POST {installId}: delete what the API holds for an install id. */
export const EVENTS_FORGET_ROUTE = "/v1/events/forget";

/**
 * Off: the route does not exist yet. Turn on only when the API serves
 * `EVENTS_ROUTE` and the app shows the opt-out switch.
 */
export const EVENTS_UPLOAD_ENABLED: boolean = false;

/** Statuses that mean "this batch will never be accepted": drop it. */
const REFUSED = new Set([400, 413, 422]);

/** The uploader for the weather API. Never sends the sign-in token. */
export function createApiUploader(): Uploader {
  return {
    async send(batch: EventBatch): Promise<SendResult> {
      try {
        // An empty token tells the client not to attach the session.
        await apiRequest(EVENTS_ROUTE, {
          method: "POST",
          json: batch,
          token: "",
        });
        return "ok";
      } catch (err) {
        if (err instanceof ApiError && REFUSED.has(err.status)) return "drop";
        return "retry";
      }
    },
    async forget(installId: string): Promise<"ok" | "retry"> {
      try {
        await apiRequest(EVENTS_FORGET_ROUTE, {
          method: "POST",
          json: { installId },
          token: "",
        });
        return "ok";
      } catch (err) {
        // Nothing to delete is as good as deleted.
        if (err instanceof ApiError && err.status === 404) return "ok";
        return "retry";
      }
    },
  };
}

const FILE_NAME = "mukoko-events.json";
const WEB_KEY = "mukoko.events";

/** The app's document directory (localStorage on web). */
export function createDefaultStorage(): QueueStorage {
  if (Platform.OS === "web") {
    return {
      async read() {
        if (typeof window === "undefined") return null;
        return window.localStorage.getItem(WEB_KEY);
      },
      async write(value) {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(WEB_KEY, value);
      },
    };
  }
  // Loaded on first use, so importing this module never touches the disk.
  const file = async () => {
    const { File, Paths } = await import("expo-file-system");
    return new File(Paths.document, FILE_NAME);
  };
  return {
    async read() {
      const f = await file();
      return f.exists ? f.text() : null;
    },
    async write(value) {
      const f = await file();
      if (!f.exists) f.create();
      await f.write(value);
    },
  };
}

function clientInfo(): ClientInfo {
  const platform =
    Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "web";
  return {
    app: "mukoko-weather",
    platform,
    version: Application.nativeApplicationVersion ?? "0.0.0",
  };
}

let queue: EventQueue | null = null;

/** The app's queue (created on first use). */
export function getEventQueue(): EventQueue {
  if (!queue) {
    queue = new EventQueue({
      storage: createDefaultStorage(),
      newId: () => Crypto.randomUUID(),
      client: clientInfo(),
      uploader: EVENTS_UPLOAD_ENABLED ? createApiUploader() : null,
    });
  }
  return queue;
}

/** Record an event. Never throws, never blocks the caller. */
export function track<K extends EventName>(
  name: K,
  props: EventProps[K],
): void {
  void getEventQueue()
    .track(name, props)
    .catch(() => {
      // Measurement must never break the app.
    });
}

/** first_open once per install id. Call on every cold start. */
export function recordAppOpen(): void {
  void getEventQueue()
    .recordAppOpen()
    .catch(() => {});
}

/** The person's switch: true stops recording and drops what is queued. */
export function setAnalyticsOptOut(optOut: boolean): Promise<void> {
  return getEventQueue().setOptOut(optOut);
}

/** A new anonymous id; the queue is cleared and the old id forgotten. */
export function resetAnalyticsId(): Promise<void> {
  return getEventQueue().resetInstallId();
}

/** Test-only: drop the singleton. */
export function __resetEventQueueForTests(): void {
  queue = null;
}
