import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSSE } from './use-sse';

// Mock fetch for SSE
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useSSE', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should not connect when clientId is null', () => {
    mockFetch.mockResolvedValue({ ok: true, body: null });
    renderHook(() => useSSE(null));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should connect with Authorization header when token provided', async () => {
    const mockReader = {
      read: vi.fn().mockResolvedValue({ done: true }),
    };
    mockFetch.mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    });

    renderHook(() => useSSE('user-1:conv-1', { token: 'test-token' }));

    // Wait for the async connect
    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat/stream/user-1%3Aconv-1'),
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token' },
        }),
      );
    });
  });

  it('should set isConnected to false on fetch failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSSE('client-1'));

    await vi.waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });
  });

  it('should set isConnected to false on non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });

    const { result } = renderHook(() => useSSE('client-1'));

    await vi.waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });
  });

  it('should parse SSE events from stream', async () => {
    const events: any[] = [];
    const sseData = 'event: message\ndata: {"type":"text"}\n\n';

    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(sseData),
        })
        .mockResolvedValue({ done: true }),
    };

    mockFetch.mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    });

    renderHook(() =>
      useSSE('client-1', {
        onEvent: (e) => events.push(e),
      }),
    );

    await vi.waitFor(() => {
      expect(events).toHaveLength(1);
      expect(events[0].event).toBe('message');
      expect(events[0].data).toBe('{"type":"text"}');
    });
  });

  it('should abort connection on unmount', async () => {
    const mockAbort = vi.fn();
    const mockReader = {
      read: vi.fn().mockImplementation(() => new Promise(() => {})), // never resolves
    };

    mockFetch.mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    });

    const { unmount } = renderHook(() => useSSE('client-1'));

    // Wait for fetch to be called
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());

    // The AbortController should have been created; simulate abort on unmount
    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.signal).toBeDefined();
    expect(callArgs.signal.aborted).toBe(false);

    unmount();

    // After unmount, the abort controller should have been aborted
    expect(callArgs.signal.aborted).toBe(true);
  });
});
