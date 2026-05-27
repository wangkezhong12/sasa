import { describe, it, expect } from 'vitest';
import { ApiKeyStrategy } from './api-key.strategy';

describe('ApiKeyStrategy', () => {
  const strategy = new ApiKeyStrategy();

  it('should have type api_key', () => {
    expect(strategy.type).toBe('api_key');
  });

  it('should return single password form field', () => {
    const fields = strategy.getFormFields();
    expect(fields).toHaveLength(1);
    expect(fields[0]).toEqual({
      name: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
    });
  });

  it('should validate and build payload', async () => {
    const payload = await strategy.validateAndBuild(
      { apiKey: 'sk-test-123' },
      { type: 'api_key', params: {} },
    );
    expect(payload).toEqual({ type: 'api_key', apiKey: 'sk-test-123' });
  });

  it('should throw if apiKey is empty', async () => {
    await expect(
      strategy.validateAndBuild({ apiKey: '' }, { type: 'api_key', params: {} }),
    ).rejects.toThrow('API Key is required');
  });

  it('should build Bearer auth headers', () => {
    const headers = strategy.buildAuthHeaders({ type: 'api_key', apiKey: 'sk-test-123' });
    expect(headers).toEqual({ Authorization: 'Bearer sk-test-123' });
  });

  it('should not have isExpired method', () => {
    expect(strategy.isExpired).toBeUndefined();
  });

  it('should not have refreshToken method', () => {
    expect(strategy.refreshToken).toBeUndefined();
  });
});
