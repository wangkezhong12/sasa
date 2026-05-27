import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OAuth2CodeStrategy } from './oauth2-code.strategy';

describe('OAuth2CodeStrategy', () => {
  const strategy = new OAuth2CodeStrategy();

  const config = {
    type: 'oauth2_code' as const,
    params: {
      tokenUrl: 'https://api.example.com/oauth/token',
      clientId: 'test-client',
      clientSecret: 'test-secret',
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should have type oauth2_code', () => {
    expect(strategy.type).toBe('oauth2_code');
  });

  it('should return empty form fields (uses redirect flow)', () => {
    const fields = strategy.getFormFields();
    expect(fields).toHaveLength(0);
  });

  it('should validate and build payload by exchanging code for token', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        access_token: 'at-oauth',
        refresh_token: 'rt-oauth',
        expires_in: 3600,
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const payload = await strategy.validateAndBuild(
      { code: 'auth-code-123', redirectUri: 'https://app.example.com/callback' },
      config,
    );

    expect(payload).toEqual({
      type: 'oauth2_code',
      accessToken: 'at-oauth',
      refreshToken: 'rt-oauth',
      expiresAt: expect.any(Number),
      clientId: 'test-client',
      clientSecret: 'test-secret',
    });

    vi.restoreAllMocks();
  });

  it('should throw if code is missing', async () => {
    await expect(
      strategy.validateAndBuild({ redirectUri: 'https://app.example.com/callback' }, config),
    ).rejects.toThrow('Authorization code is required');
  });

  it('should build Bearer auth headers', () => {
    const headers = strategy.buildAuthHeaders({
      type: 'oauth2_code',
      accessToken: 'at-oauth',
    });
    expect(headers).toEqual({ Authorization: 'Bearer at-oauth' });
  });

  it('should detect expired credentials', () => {
    expect(strategy.isExpired!({
      type: 'oauth2_code',
      accessToken: 'at-old',
      expiresAt: Date.now() - 1000,
    })).toBe(true);
  });

  it('should detect non-expired credentials', () => {
    expect(strategy.isExpired!({
      type: 'oauth2_code',
      accessToken: 'at-new',
      expiresAt: Date.now() + 60000,
    })).toBe(false);
  });

  it('should refresh token using refresh_token grant', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        access_token: 'at-refreshed',
        refresh_token: 'rt-refreshed',
        expires_in: 3600,
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const refreshed = await strategy.refreshToken!(
      {
        type: 'oauth2_code',
        accessToken: 'at-old',
        refreshToken: 'rt-old',
        expiresAt: Date.now() - 1000,
        clientId: 'test-client',
        clientSecret: 'test-secret',
      },
      config,
    );

    expect(refreshed.accessToken).toBe('at-refreshed');
    expect(refreshed.refreshToken).toBe('rt-refreshed');
    expect(refreshed.clientId).toBe('test-client');

    vi.restoreAllMocks();
  });

  it('should throw on token exchange failure', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('Bad Request'),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(
      strategy.validateAndBuild({ code: 'bad-code', redirectUri: 'https://app.example.com/callback' }, config),
    ).rejects.toThrow('Token exchange failed');

    vi.restoreAllMocks();
  });
});
