import { Test } from '@nestjs/testing';
import { CryptoService } from '../src/common/crypto/crypto.service';
import { ConnectorRegistry } from '../src/modules/connector/connector-registry.service';
import { AuthStrategyResolver } from '../src/modules/auth/auth-strategy.resolver';
import { DemoConnector } from '../src/modules/connector/connectors/demo';
import { ApiKeyStrategy, AppSecretStrategy, BasicAuthStrategy, OAuth2CodeStrategy } from '@sasa/connector-sdk';

describe('Auth Strategy E2E', () => {
  let cryptoService: CryptoService;
  let resolver: AuthStrategyResolver;
  let connectorRegistry: ConnectorRegistry;

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  afterAll(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  beforeEach(() => {
    cryptoService = new CryptoService();
    resolver = new AuthStrategyResolver();
    connectorRegistry = new ConnectorRegistry();
    connectorRegistry.register('demo', new DemoConnector());
  });

  describe('api_key binding flow', () => {
    it('should encrypt/decrypt CredentialPayload round-trip', () => {
      const payload = { type: 'api_key' as const, apiKey: 'test-api-key-123' };
      const encrypted = cryptoService.encrypt(JSON.stringify(payload));
      const decrypted = cryptoService.decrypt(encrypted);
      expect(JSON.parse(decrypted)).toEqual(payload);
    });

    it('should build auth headers via strategy', () => {
      const strategy = resolver.resolve('api_key');
      const payload = { type: 'api_key' as const, apiKey: 'sk-abc' };
      expect(strategy.buildAuthHeaders(payload)).toEqual({
        Authorization: 'Bearer sk-abc',
      });
    });
  });

  describe('app_secret payload flow', () => {
    it('should detect expired credentials', () => {
      const strategy = resolver.resolve('app_secret');
      const expired = {
        type: 'app_secret' as const,
        appId: 'app', appSecret: 'secret',
        accessToken: 'at', expiresAt: Date.now() - 1000,
      };
      expect(strategy.isExpired?.(expired)).toBe(true);

      const valid = { ...expired, expiresAt: Date.now() + 7200000 };
      expect(strategy.isExpired?.(valid)).toBe(false);
    });

    it('should build Bearer headers from accessToken', () => {
      const strategy = resolver.resolve('app_secret');
      const payload = {
        type: 'app_secret' as const,
        appId: 'app', appSecret: 'secret',
        accessToken: 'at-123',
      };
      expect(strategy.buildAuthHeaders(payload)).toEqual({
        Authorization: 'Bearer at-123',
      });
    });
  });

  describe('basic_auth payload flow', () => {
    it('should build Basic auth headers in basic mode', () => {
      const strategy = resolver.resolve('basic_auth');
      const payload = {
        type: 'basic_auth' as const,
        username: 'admin', password: 'pass',
      };
      const headers = strategy.buildAuthHeaders(payload, {
        type: 'basic_auth', params: { authMode: 'basic' },
      });
      expect(headers.Authorization).toMatch(/^Basic /);
    });

    it('should return empty headers in cookie mode', () => {
      const strategy = resolver.resolve('basic_auth');
      const payload = {
        type: 'basic_auth' as const,
        username: 'admin', password: 'pass',
      };
      const headers = strategy.buildAuthHeaders(payload, {
        type: 'basic_auth', params: { authMode: 'cookie' },
      });
      expect(headers).toEqual({});
    });
  });

  describe('oauth2_code payload flow', () => {
    it('should build Bearer headers from accessToken', () => {
      const strategy = resolver.resolve('oauth2_code');
      const payload = {
        type: 'oauth2_code' as const,
        accessToken: 'oauth-at',
      };
      expect(strategy.buildAuthHeaders(payload)).toEqual({
        Authorization: 'Bearer oauth-at',
      });
    });

    it('should detect expired credentials', () => {
      const strategy = resolver.resolve('oauth2_code');
      const expired = {
        type: 'oauth2_code' as const,
        accessToken: 'at', expiresAt: Date.now() - 1000,
      };
      expect(strategy.isExpired?.(expired)).toBe(true);
    });
  });

  describe('DemoConnector integration', () => {
    it('should have api_key auth strategy config', () => {
      const connector = connectorRegistry.get('demo');
      const config = connector.getAuthStrategyConfig('api_key');
      expect(config).toEqual({ type: 'api_key', params: {} });
    });

    it('should return undefined for unsupported auth type', () => {
      const connector = connectorRegistry.get('demo');
      expect(connector.getAuthStrategyConfig('oauth2_code')).toBeUndefined();
    });

    it('should accept auth headers in executeToolCall', async () => {
      const connector = connectorRegistry.get('demo');
      const result = await connector.executeToolCall(
        'unknown_tool', {}, { Authorization: 'Bearer test-key' },
      );
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TOOL_NOT_FOUND');
    });
  });
});
