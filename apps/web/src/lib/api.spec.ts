import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { apiFetch, ApiError, getApiBaseUrl } from './api';

describe('apiFetch', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('should call fetch with correct URL and headers', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'test' }),
    });

    const result = await apiFetch('/test');
    expect(result).toEqual({ data: 'test' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });

  it('should add Authorization header when token provided', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiFetch('/test', { token: 'my-jwt' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer my-jwt' }),
      }),
    );
  });

  it('should not add Authorization header when no token', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiFetch('/test');
    const call = (global.fetch as any).mock.calls[0];
    expect(call[1].headers).not.toHaveProperty('Authorization');
  });

  it('should throw ApiError on non-ok response', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: 'Not found' }),
    });

    await expect(apiFetch('/test')).rejects.toThrow('Not found');
    await expect(apiFetch('/test')).rejects.toBeInstanceOf(ApiError);
  });

  it('should throw ApiError with status 401 on auth failure', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({}),
    });

    try {
      await apiFetch('/test');
    } catch (err) {
      expect((err as ApiError).status).toBe(401);
      expect((err as ApiError).message).toBe('Authentication required');
    }
  });

  it('should handle JSON parse failure gracefully', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('Invalid JSON')),
    });

    await expect(apiFetch('/test')).rejects.toThrow('API error: 500');
  });
});

describe('getApiBaseUrl', () => {
  it('should return the base URL', () => {
    const url = getApiBaseUrl();
    expect(url).toContain('http');
  });
});
