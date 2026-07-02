/**
 * Tests for the Shamwari chat client. Network is mocked at the apiFetch
 * boundary so we exercise request shaping (trim, caps, activities) and the
 * graceful error/fallback mapping without hitting the backend.
 */

jest.mock('@/api/client', () => {
  class ApiError extends Error {
    status: number;
    url: string;
    body?: unknown;
    constructor(message: string, status: number, url: string, body?: unknown) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.url = url;
      this.body = body;
    }
  }
  return { __esModule: true, apiFetch: jest.fn(), ApiError };
});

import { ApiError, apiFetch } from '@/api/client';
import {
  EmptyMessageError,
  MAX_MESSAGE_LEN,
  sendChatMessage,
} from '@/api/chat';

const mockFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('sendChatMessage', () => {
  it('posts to /api/py/chat with a trimmed message and empty history', async () => {
    mockFetch.mockResolvedValue({ response: 'Hello', references: [] });
    const res = await sendChatMessage({ message: '  hi there  ' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [path, opts] = mockFetch.mock.calls[0];
    expect(path).toBe('/api/py/chat');
    expect(opts?.method).toBe('POST');
    expect(opts?.json).toEqual({ message: 'hi there', history: [] });
    expect(res).toEqual({ response: 'Hello', references: [], error: undefined });
  });

  it('caps history to the last 10 turns and truncates each entry', async () => {
    mockFetch.mockResolvedValue({ response: 'ok', references: [] });
    const history = Array.from({ length: 14 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: 'x'.repeat(MAX_MESSAGE_LEN + 50),
    }));

    await sendChatMessage({ message: 'q', history });

    const body = mockFetch.mock.calls[0][1]?.json as {
      history: { content: string }[];
    };
    expect(body.history).toHaveLength(10);
    expect(body.history[0].content.length).toBe(MAX_MESSAGE_LEN);
  });

  it('truncates the outgoing message to the server maximum', async () => {
    mockFetch.mockResolvedValue({ response: 'ok', references: [] });
    await sendChatMessage({ message: 'y'.repeat(MAX_MESSAGE_LEN + 100) });

    const body = mockFetch.mock.calls[0][1]?.json as { message: string };
    expect(body.message.length).toBe(MAX_MESSAGE_LEN);
  });

  it('includes activities only when provided and non-empty', async () => {
    mockFetch.mockResolvedValue({ response: 'ok', references: [] });

    await sendChatMessage({ message: 'q', activities: [] });
    expect((mockFetch.mock.calls[0][1]?.json as object)).not.toHaveProperty(
      'activities',
    );

    mockFetch.mockClear();
    await sendChatMessage({ message: 'q', activities: ['running'] });
    expect(mockFetch.mock.calls[0][1]?.json).toMatchObject({
      activities: ['running'],
    });
  });

  it('throws EmptyMessageError for a blank message', async () => {
    await expect(sendChatMessage({ message: '   ' })).rejects.toBeInstanceOf(
      EmptyMessageError,
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns a rate-limit fallback on HTTP 429', async () => {
    mockFetch.mockRejectedValue(new ApiError('rate', 429, '/api/py/chat'));
    const res = await sendChatMessage({ message: 'q' });
    expect(res.error).toBe(true);
    expect(res.references).toEqual([]);
    expect(res.response).toMatch(/hourly limit/i);
  });

  it('returns a service fallback on HTTP 503', async () => {
    mockFetch.mockRejectedValue(new ApiError('down', 503, '/api/py/chat'));
    const res = await sendChatMessage({ message: 'q' });
    expect(res.error).toBe(true);
    expect(res.response).toMatch(/resting/i);
  });

  it('prefers a server-supplied response body over the generic fallback', async () => {
    mockFetch.mockRejectedValue(
      new ApiError('err', 503, '/api/py/chat', {
        response: 'Custom recovery message',
      }),
    );
    const res = await sendChatMessage({ message: 'q' });
    expect(res.response).toBe('Custom recovery message');
    expect(res.error).toBe(true);
  });

  it('returns a generic fallback on a non-API (network) error', async () => {
    mockFetch.mockRejectedValue(new Error('Network request failed'));
    const res = await sendChatMessage({ message: 'q' });
    expect(res.error).toBe(true);
    expect(res.response).toMatch(/trouble connecting/i);
  });

  it('rethrows AbortError so callers can ignore cancellations', async () => {
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    mockFetch.mockRejectedValue(abort);
    await expect(sendChatMessage({ message: 'q' })).rejects.toBe(abort);
  });
});
