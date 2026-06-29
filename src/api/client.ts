/**
 * Thin fetch wrapper around the mukoko-weather Python API (`/api/py/*`).
 *
 * Base URL is read from EXPO_PUBLIC_API_URL at build time. Defaults to
 * production (https://weather.mukoko.com). For local dev set
 *   EXPO_PUBLIC_API_URL=http://<your-lan-ip>:3000
 * in your .env so the simulator/device can reach a Next.js dev server.
 *
 * The mobile session token (issued by WorkOS sign-in) is read lazily so we
 * don't create a SecureStore dependency cycle when this module is imported
 * from a non-React context (e.g. background tasks).
 */

import { Platform } from 'react-native';

const DEFAULT_BASE_URL = 'https://weather.mukoko.com';

export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') ?? DEFAULT_BASE_URL;

export type FetchOptions = Omit<RequestInit, 'body'> & {
  /** Parsed JSON body. Will be JSON-stringified + Content-Type set. */
  json?: unknown;
  /** Query string parameters; undefined / null values are dropped. */
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Bearer token; overrides any token resolved from SecureStore. */
  token?: string | null;
  /** AbortController signal. */
  signal?: AbortSignal;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let cachedTokenResolver: (() => Promise<string | null>) | null = null;

/**
 * Register a function that resolves the current session bearer token.
 * Called by src/api/auth.ts at app boot so we don't hard-import SecureStore here.
 */
export function setAuthTokenResolver(resolver: (() => Promise<string | null>) | null) {
  cachedTokenResolver = resolver;
}

export function buildUrl(path: string, query?: FetchOptions['query']): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${cleanPath}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: FetchOptions = {},
): Promise<T> {
  const { json, query, headers, token, ...rest } = opts;
  const url = buildUrl(path, query);

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    'X-Mukoko-Client': `mukoko-mobile/${Platform.OS}`,
    ...((headers as Record<string, string>) ?? {}),
  };

  const bearer = token ?? (cachedTokenResolver ? await cachedTokenResolver() : null);
  if (bearer) {
    finalHeaders.Authorization = `Bearer ${bearer}`;
  }

  let body: BodyInit | undefined;
  if (json !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }

  const response = await fetch(url, {
    ...rest,
    headers: finalHeaders,
    body,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const parsed: unknown = contentType.includes('application/json')
    ? await response.json().catch(() => undefined)
    : await response.text().catch(() => undefined);

  if (!response.ok) {
    throw new ApiError(
      `Request to ${url} failed: ${response.status}`,
      response.status,
      url,
      parsed,
    );
  }

  return parsed as T;
}
