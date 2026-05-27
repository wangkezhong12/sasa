import { AuthStrategyResolver } from './auth-strategy.resolver';
import { ApiKeyStrategy } from '@sasa/connector-sdk';
import type { AuthType } from '@sasa/shared';

describe('AuthStrategyResolver', () => {
  let resolver: AuthStrategyResolver;

  beforeEach(() => {
    resolver = new AuthStrategyResolver();
  });

  it('should resolve api_key strategy', () => {
    const strategy = resolver.resolve('api_key');
    expect(strategy).toBeInstanceOf(ApiKeyStrategy);
    expect(strategy.type).toBe('api_key');
  });

  it('should resolve app_secret strategy', () => {
    const strategy = resolver.resolve('app_secret');
    expect(strategy.type).toBe('app_secret');
  });

  it('should resolve basic_auth strategy', () => {
    const strategy = resolver.resolve('basic_auth');
    expect(strategy.type).toBe('basic_auth');
  });

  it('should resolve oauth2_code strategy', () => {
    const strategy = resolver.resolve('oauth2_code');
    expect(strategy.type).toBe('oauth2_code');
  });

  it('should throw for unknown auth type', () => {
    expect(() => resolver.resolve('unknown' as AuthType)).toThrow('Unknown auth type: unknown');
  });
});
