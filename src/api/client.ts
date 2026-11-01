/**
 * Transport for the Mukoko weather API. Every network call the app makes goes
 * through this module, and it only ever reaches the Cloudflare backend.
 *
 * Today that is the public weather Worker (`mukoko-dev/mukoko-weather`,
 * `workers/public-api`). The Mukoko consumer API (`mukoko-dev/mukoko-api`,
 * `api.mukoko.com`) will take over; it has no DNS yet. Moving is a change to
 * `DEFAULT_API_BASE_URL` and the `ROUTES` table below, nothing else.
 *
 * The app never talks to a database. Data platforms sit behind the API.
 * `scripts/check-cloudflare-only.mjs` (run by `npm test`) fails the build if a
 * source file, config or doc names a retired host, a database URL, or a
 * weather provider.
 *
 * `EXPO_PUBLIC_API_URL` overrides the default, but only with a host on
 * `ALLOWED_API_HOSTS` (or, in a development build, a machine on your own
 * network running `wrangler dev`). Anything else is ignored. The value is
 * inlined at build time, so it must never hold a secret.
 *
 * The mobile session token (issued by WorkOS sign-in) is read lazily so we
 * don't create a SecureStore dependency cycle when this module is imported
 * from a non-React context (e.g. background tasks).
 */

import { Platform } from "react-native";

/** The public weather Worker: Cloudflare, behind `weather-api.mukoko.com`. */
export const DEFAULT_API_BASE_URL = "https://weather-api.mukoko.com";

/**
 * Hosts the app may call. `api.mukoko.com` is the Mukoko consumer API, which
 * reaches the weather Worker over a service binding (no DNS yet).
 */
export const ALLOWED_API_HOSTS: readonly string[] = [
  "weather-api.mukoko.com",
  "api.mukoko.com",
];

/**
 * Every route the app calls, in one place. These are the weather Worker's
 * paths; the consumer API serves the same data under `/v1/weather/*`, so the
 * move is an edit to this table.
 */
export const ROUTES = {
  /** GET ?lat&lon -> full weather (current, hourly, daily). */
  weather: "/v1/weather",
  /** GET ?lat&lon[&autoCreate=true] -> the place for a coordinate. */
  geo: "/v1/geo",
  /** GET ?q&limit -> places matching a name. */
  search: "/v1/search",
  /** GET ?slug -> one place. */
  locations: "/v1/locations",
  /** GET [?id|category|q|mode=categories] -> the activities (or categories). */
  activities: "/v1/activities",
  /** GET [?key] -> the suitability rules the activity ratings are read from. */
  suitability: "/v1/suitability",
  /** GET ?location&hours -> recent community reports; POST -> file one. Not live yet. */
  reports: "/v1/reports",
  /** POST {reportId} -> upvote a report. Not live yet. */
  reportsUpvote: "/v1/reports/upvote",
  /** POST {location, activities?} -> {insight}: the AI weather summary. */
  aiSummary: "/v1/ai/summary",
  /** POST {message, locationName, ...} -> {response}: the inline follow-up. */
  aiFollowup: "/v1/ai/followup",
  /** POST {deviceId, preferences?} -> a device preference profile. */
  devices: "/v1/devices",
  /** POST {message, history, activities?} -> Shamwari's reply. */
  chat: "/v1/ai/chat",
} as const;

/** `http(s)://host[:port]` with nothing after it, as the base URL must be. */
const ORIGIN = /^(https?):\/\/([a-z0-9.-]+)(?::(\d{1,5}))?\/*$/i;

/** A machine on the developer's own network (a local `wrangler dev`). */
function isLocalHost(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".local") ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host)
  );
}

/**
 * The base URL to call: `raw` (the `EXPO_PUBLIC_API_URL` value) when it names
 * an allowed host over HTTPS, or a machine on the developer's network in a
 * development build; otherwise the default. Never throws.
 */
export function resolveApiBaseUrl(
  raw: string | undefined,
  dev: boolean,
): string {
  const value = raw?.trim();
  if (!value) return DEFAULT_API_BASE_URL;
  const match = ORIGIN.exec(value);
  if (!match) return DEFAULT_API_BASE_URL;
  const scheme = match[1].toLowerCase();
  const host = match[2].toLowerCase();
  const origin = `${scheme}://${host}${match[3] ? `:${match[3]}` : ""}`;
  if (scheme === "https" && !match[3] && ALLOWED_API_HOSTS.includes(host)) {
    return origin;
  }
  if (dev && isLocalHost(host)) return origin;
  return DEFAULT_API_BASE_URL;
}

export const API_BASE_URL: string = resolveApiBaseUrl(
  process.env.EXPO_PUBLIC_API_URL,
  __DEV__,
);

export type FetchOptions = Omit<RequestInit, "body"> & {
  /** Parsed JSON body. Will be JSON-stringified + Content-Type set. */
  json?: unknown;
  /** Query string parameters; undefined / null values are dropped. */
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Bearer token; overrides any token resolved from SecureStore. */
  token?: string | null;
  /** AbortController signal. */
  signal?: AbortSignal;
};

/** What a failed answer says, whichever error format the API used. */
export type ApiProblem = {
  /** A stable machine code, for example `rate_limited`. */
  code?: string;
  /** Text written for the caller (not always fit for a screen). */
  message?: string;
};

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * Read an error body. Three formats exist and all are understood:
 *   - the weather Worker: `{ error: "code", error_description: "text" }`
 *   - the consumer API:   `{ error: { code, message }, requestId }`
 *   - RFC 9457 problems:  `{ type, title, status, detail }`
 * Anything else yields an empty problem.
 */
export function parseProblem(body: unknown): ApiProblem {
  if (!body || typeof body !== "object") return {};
  const b = body as Record<string, unknown>;
  const error = b.error;
  if (typeof error === "string") {
    return { code: text(error), message: text(b.error_description) };
  }
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    return { code: text(e.code), message: text(e.message) };
  }
  return { code: text(b.code), message: text(b.detail) ?? text(b.title) };
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let cachedTokenResolver: (() => Promise<string | null>) | null = null;

/**
 * Register a function that resolves the current session bearer token.
 * Called by src/api/auth.ts at app boot so we don't hard-import SecureStore here.
 */
export function setAuthTokenResolver(
  resolver: (() => Promise<string | null>) | null,
) {
  cachedTokenResolver = resolver;
}

export function buildUrl(path: string, query?: FetchOptions["query"]): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${cleanPath}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export type ApiResult<T> = {
  data: T;
  /** Response headers, for the few that describe the data (`X-Fetched-At`). */
  headers: Headers;
  status: number;
};

/** Like `apiFetch`, but also returns the response headers. */
export async function apiRequest<T = unknown>(
  path: string,
  opts: FetchOptions = {},
): Promise<ApiResult<T>> {
  const { json, query, headers, token, ...rest } = opts;
  const url = buildUrl(path, query);

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    "X-Mukoko-Client": `mukoko-mobile/${Platform.OS}`,
    ...((headers as Record<string, string>) ?? {}),
  };

  const bearer =
    token ?? (cachedTokenResolver ? await cachedTokenResolver() : null);
  if (bearer) {
    finalHeaders.Authorization = `Bearer ${bearer}`;
  }

  let body: BodyInit | undefined;
  if (json !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  }

  const response = await fetch(url, {
    ...rest,
    headers: finalHeaders,
    body,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const parsed: unknown = contentType.includes("json")
    ? await response.json().catch(() => undefined)
    : await response.text().catch(() => undefined);

  if (!response.ok) {
    // The server's own sentence when it sent one; never the URL.
    const problem = parseProblem(parsed);
    throw new ApiError(
      problem.message ?? `Request failed (${response.status})`,
      response.status,
      url,
      parsed,
    );
  }

  return {
    data: parsed as T,
    headers: response.headers,
    status: response.status,
  };
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: FetchOptions = {},
): Promise<T> {
  return (await apiRequest<T>(path, opts)).data;
}
