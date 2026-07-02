/**
 * Shamwari chat endpoint — mirrors the web app's POST /api/py/chat.
 *
 * The Python backend (api/py/_chat.py) runs Claude with tool use over the
 * shared weather / locations data. Request and response shapes match the web
 * client exactly:
 *
 *   request:  { message, history, activities? }
 *   response: { response, references, error? }
 *
 * The backend rate-limits to 20 requests/hour/IP, caps history at 10 messages,
 * and rejects messages longer than 2000 chars (HTTP 400). We enforce the same
 * limits client-side so we never send a request the server will reject, and we
 * translate error responses (rate-limit, service unavailable, network) into a
 * graceful assistant fallback so the UI always has something to render.
 */

import { ApiError, apiFetch } from '@/api/client';

/** Server rejects messages longer than this (api/py/_chat.py MAX_MESSAGE_LEN). */
export const MAX_MESSAGE_LEN = 2000;
/** Server truncates history to the last N messages (api/py/_chat.py MAX_HISTORY). */
export const MAX_HISTORY = 10;

export type ChatRole = 'user' | 'assistant';

export type ChatHistoryMessage = {
  role: ChatRole;
  content: string;
};

export type ChatReference = {
  slug: string;
  name: string;
  /** "location" | "weather" — the backend tags each reference by tool origin. */
  type: string;
};

export type ChatResponse = {
  response: string;
  references: ChatReference[];
  /** True when the response is a graceful fallback rather than a real answer. */
  error?: boolean;
};

export type SendChatMessageOptions = {
  /** The user's new message. Trimmed + capped to MAX_MESSAGE_LEN before sending. */
  message: string;
  /** Prior conversation turns. Capped to the last MAX_HISTORY, each truncated. */
  history?: ChatHistoryMessage[];
  /** User's selected activity ids, for personalised advice (optional). */
  activities?: string[];
  /** Abort signal so an in-flight request can be cancelled on unmount / resend. */
  signal?: AbortSignal;
};

/** Thrown when sendChatMessage is called with an empty message. */
export class EmptyMessageError extends Error {
  constructor() {
    super('Message is required');
    this.name = 'EmptyMessageError';
  }
}

const FALLBACK = {
  rateLimit:
    "You've reached the hourly limit for Shamwari. Please take a breath and try again a little later.",
  unavailable:
    "Shamwari's AI service is resting right now. Please try again in a few minutes.",
  generic:
    "I'm having trouble connecting right now. Please check your connection and try again in a moment.",
} as const;

/** Map an HTTP failure to a friendly, on-brand fallback message. */
function fallbackForStatus(status: number): string {
  if (status === 429) return FALLBACK.rateLimit;
  if (status === 503) return FALLBACK.unavailable;
  return FALLBACK.generic;
}

/**
 * Send a message to Shamwari and resolve the assistant's reply.
 *
 * Never throws for network / API / rate-limit failures — instead it resolves a
 * ChatResponse with `error: true` and a friendly fallback message so the caller
 * can append it to the transcript like any other assistant turn. It DOES rethrow
 * AbortError so callers can distinguish a cancelled request from a real reply.
 */
export async function sendChatMessage(
  opts: SendChatMessageOptions,
): Promise<ChatResponse> {
  const message = opts.message.trim().slice(0, MAX_MESSAGE_LEN);
  if (!message) {
    throw new EmptyMessageError();
  }

  const history = (opts.history ?? [])
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LEN) }));

  const body: {
    message: string;
    history: ChatHistoryMessage[];
    activities?: string[];
  } = { message, history };

  if (opts.activities && opts.activities.length > 0) {
    body.activities = opts.activities;
  }

  try {
    const data = await apiFetch<ChatResponse>('/api/py/chat', {
      method: 'POST',
      json: body,
      signal: opts.signal,
    });
    return {
      response: data.response ?? FALLBACK.generic,
      references: Array.isArray(data.references) ? data.references : [],
      error: data.error,
    };
  } catch (err) {
    // Let the caller ignore user-initiated cancellations.
    if (err instanceof Error && err.name === 'AbortError') throw err;

    if (err instanceof ApiError) {
      // The server may include a friendlier message in the JSON body; prefer it.
      const errBody = err.body;
      const bodyResponse =
        errBody && typeof errBody === 'object' && 'response' in errBody
          ? (errBody as { response?: unknown }).response
          : undefined;
      return {
        response:
          typeof bodyResponse === 'string' && bodyResponse.length > 0
            ? bodyResponse
            : fallbackForStatus(err.status),
        references: [],
        error: true,
      };
    }

    return { response: FALLBACK.generic, references: [], error: true };
  }
}
