import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppSecretStrategy } from './app-secret.strategy';

describe('AppSecretStrategy', () => {
  const strategy = new AppSecretStrategy();

  const config = {
    type: 'app_secret' as const,
    params: { tokenUrl: 'https://api.example.com/auth/token' },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should have type app_secret', () => {
    expect(strategy.type).toBe('app_secret');
  });

  it('should return appId and appSecret form fields', () => {
    const fields = strategy.getFormFields();
    expect(fields).toHaveLength(2);
    expect(fields[0]).toEqual({
      name: 'appId',
      label: 'App ID',
      type: 'text',
      required: true,
    });
    expect(fields[1]).toEqual({
      name: 'appSecret',
      label: 'App Secret',
      type: 'password',
      required: true,
    });
  });

  it('should validate and build payload by exchanging for token', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ access_token: 'at-123', expires_in: 7200 }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const payload = await strategy.validateAndBuild(
      { appId: 'my-app', appSecret: 'my-secret' },
      config,
    );

    expect(payload).toEqual({
      type: 'app_secret',
      appId: 'my-app',
      appSecret: 'my-secret',
      accessToken: 'at-123',
      expiresAt: expect.any(Number),
    });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/auth/token',
      expect.objectContaining({ method: 'POST' }),
    );

    vi.restoreAllMocks();
  });

  it('should throw if appId is missing', async () => {
    await expect(
      strategy.validateAndBuild({ appSecret: 'secret' }, config),
    ).rejects.toThrow('App ID is required');
  });

  it('should throw if appSecret is missing', async () => {
    await expect(
      strategy.validateAndBuild({ appId: 'app' }, config),
    ).rejects.toThrow('App Secret is required');
  });

  it('should build Bearer auth headers from accessToken', () => {
    const headers = strategy.buildAuthHeaders({
      type: 'app_secret',
      appId: 'app',
      appSecret: 'secret',
      accessToken: 'at-123',
    });
    expect(headers).toEqual({ Authorization: 'Bearer at-123' });
  });

  it('should detect expired credentials', () => {
    const expired = strategy.isExpired!({
      type: 'app_secret',
      appId: 'app',
      appSecret: 'secret',
      accessToken: 'at-old',
      expiresAt: Date.now() - 1000,
    });
    expect(expired).toBe(true);
  });

  it('should detect non-expired credentials', () => {
    const notExpired = strategy.isExpired!({
      type: 'app_secret',
      appId: 'app',
      appSecret: 'secret',
      accessToken: 'at-new',
      expiresAt: Date.now() + 60000,
    });
    expect(notExpired).toBe(false);
  });

  it('should refresh token by re-exchanging appId/appSecret', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ access_token: 'at-refreshed', expires_in: 7200 }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const refreshed = await strategy.refreshToken!(
      {
        type: 'app_secret',
        appId: 'my-app',
        appSecret: 'my-secret',
        accessToken: 'at-old',
        expiresAt: Date.now() - 1000,
      },
      config,
    );

    expect(refreshed.accessToken).toBe('at-refreshed');
    expect(refreshed.appId).toBe('my-app');
    expect(refreshed.appSecret).toBe('my-secret');

    vi.restoreAllMocks();
  });

  it('should throw on token exchange failure', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(
      strategy.validateAndBuild({ appId: 'app', appSecret: 'secret' }, config),
    ).rejects.toThrow('Token exchange failed');

    vi.restoreAllMocks();
  });
});
