import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BasicAuthStrategy } from './basic-auth.strategy';

describe('BasicAuthStrategy', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('basic mode', () => {
    const config = {
      type: 'basic_auth' as const,
      params: { authMode: 'basic' },
    };
    const strategy = new BasicAuthStrategy();

    it('should have type basic_auth', () => {
      expect(strategy.type).toBe('basic_auth');
    });

    it('should return username and password form fields', () => {
      const fields = strategy.getFormFields();
      expect(fields).toHaveLength(2);
      expect(fields[0]).toEqual({
        name: 'username',
        label: '用户名',
        type: 'text',
        required: true,
      });
      expect(fields[1]).toEqual({
        name: 'password',
        label: '密码',
        type: 'password',
        required: true,
      });
    });

    it('should validate and build payload by calling loginUrl', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'kdservice-sessionid=abc123' },
      });
      vi.stubGlobal('fetch', mockFetch);

      const payload = await strategy.validateAndBuild(
        { username: 'admin', password: 'pass123' },
        { type: 'basic_auth', params: { authMode: 'basic', loginUrl: 'https://erp.example.com/login' } },
      );

      expect(payload).toEqual({
        type: 'basic_auth',
        username: 'admin',
        password: 'pass123',
      });

      vi.restoreAllMocks();
    });

    it('should throw if username is missing', async () => {
      await expect(
        strategy.validateAndBuild({ password: 'pass' }, config),
      ).rejects.toThrow('用户名 is required');
    });

    it('should throw if password is missing', async () => {
      await expect(
        strategy.validateAndBuild({ username: 'admin' }, config),
      ).rejects.toThrow('密码 is required');
    });

    it('should build Basic auth headers', () => {
      const headers = strategy.buildAuthHeaders(
        { type: 'basic_auth', username: 'admin', password: 'pass123' },
        config,
      );
      expect(headers).toEqual({
        Authorization: `Basic ${Buffer.from('admin:pass123').toString('base64')}`,
      });
    });
  });

  describe('cookie mode', () => {
    const config = {
      type: 'basic_auth' as const,
      params: { authMode: 'cookie', loginUrl: 'https://erp.example.com/login' },
    };
    const strategy = new BasicAuthStrategy();

    it('should build Cookie auth headers after login', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'kdservice-sessionid=sess-abc' },
      });
      vi.stubGlobal('fetch', mockFetch);

      // In cookie mode, validateAndBuild calls loginUrl, then buildAuthHeaders returns cookie
      const payload = await strategy.validateAndBuild(
        { username: 'admin', password: 'pass123' },
        config,
      );
      expect(payload).toEqual({
        type: 'basic_auth',
        username: 'admin',
        password: 'pass123',
      });

      vi.restoreAllMocks();
    });

    it('should return empty headers in cookie mode (session managed externally)', () => {
      const headers = strategy.buildAuthHeaders(
        { type: 'basic_auth', username: 'admin', password: 'pass123' },
        config,
      );
      // Cookie mode: the session is managed by CredentialManager, strategy returns empty headers
      expect(headers).toEqual({});
    });
  });

  it('should refresh by re-logging in', async () => {
    const strategy = new BasicAuthStrategy();
    const config = {
      type: 'basic_auth' as const,
      params: { authMode: 'cookie', loginUrl: 'https://erp.example.com/login' },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'kdservice-sessionid=new-sess' },
    });
    vi.stubGlobal('fetch', mockFetch);

    const refreshed = await strategy.refreshToken!(
      { type: 'basic_auth', username: 'admin', password: 'pass123' },
      config,
    );

    expect(refreshed).toEqual({
      type: 'basic_auth',
      username: 'admin',
      password: 'pass123',
    });

    vi.restoreAllMocks();
  });

  it('should throw on login failure', async () => {
    const strategy = new BasicAuthStrategy();
    const config = {
      type: 'basic_auth' as const,
      params: { authMode: 'basic', loginUrl: 'https://erp.example.com/login' },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(
      strategy.validateAndBuild({ username: 'admin', password: 'wrong' }, config),
    ).rejects.toThrow('Login failed');

    vi.restoreAllMocks();
  });
});
