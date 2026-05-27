import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseRestConnector } from './base-connector';
import type { ConnectorToolDefinition, AuthType, AuthStrategyConfig } from '@sasa/shared';

class TestConnector extends BaseRestConnector {
  name = 'test-connector';
  version = '1.0.0';
  supportedAuthTypes: AuthType[] = ['api_key'];
  override protocol = 'rest' as const;

  getBaseUrl() {
    return 'https://api.example.com';
  }

  getToolDefinitions(): ConnectorToolDefinition[] {
    return [
      {
        name: 'get_items',
        displayName: 'Get Items',
        description: 'Fetch items',
        parameters: { type: 'object', properties: {} },
        requiredPermission: 'items:read',
        riskLevel: 'read',
        apiMapping: { method: 'GET', path: '/items' },
      },
      {
        name: 'create_item',
        displayName: 'Create Item',
        description: 'Create a new item',
        parameters: { type: 'object', properties: {} },
        requiredPermission: 'items:write',
        riskLevel: 'write',
        apiMapping: { method: 'POST', path: '/items', bodyMapping: { name: 'itemName' } },
      },
      {
        name: 'get_item_by_id',
        displayName: 'Get Item By ID',
        description: 'Fetch a specific item',
        parameters: { type: 'object', properties: {} },
        requiredPermission: 'items:read',
        riskLevel: 'read',
        apiMapping: { method: 'GET', path: '/items/{id}' },
      },
    ];
  }

  getAuthStrategyConfig(authType: AuthType): AuthStrategyConfig | undefined {
    if (authType === 'api_key') {
      return { type: 'api_key', params: {} };
    }
    return undefined;
  }
}

describe('BaseRestConnector', () => {
  let connector: TestConnector;

  beforeEach(() => {
    connector = new TestConnector();
  });

  it('should have correct protocol', () => {
    expect(connector.protocol).toBe('rest');
  });

  it('should return tool definitions', () => {
    const tools = connector.getToolDefinitions();
    expect(tools).toHaveLength(3);
    expect(tools[0].name).toBe('get_items');
  });

  it('should return auth strategy config for api_key', () => {
    const config = connector.getAuthStrategyConfig('api_key');
    expect(config).toEqual({ type: 'api_key', params: {} });
  });

  it('should return undefined for unsupported auth type', () => {
    const config = connector.getAuthStrategyConfig('oauth2_code');
    expect(config).toBeUndefined();
  });

  it('should return TOOL_NOT_FOUND for unknown tool', async () => {
    const result = await connector.executeToolCall('unknown_tool', {}, { Authorization: 'Bearer test-key' });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('TOOL_NOT_FOUND');
  });

  it('should execute GET tool call with auth headers', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await connector.executeToolCall('get_items', {}, { Authorization: 'Bearer test-key' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ items: [] });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/items',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      }),
    );

    vi.restoreAllMocks();
  });

  it('should resolve path parameters', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: '123', name: 'test' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await connector.executeToolCall('get_item_by_id', { id: '123' }, { Authorization: 'Bearer test-key' });
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/items/123',
      expect.anything(),
    );

    vi.restoreAllMocks();
  });

  it('should execute POST tool call with body mapping', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'new-1' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await connector.executeToolCall('create_item', { itemName: 'Widget' }, { Authorization: 'Bearer test-key' });
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/items',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Widget' }),
      }),
    );

    vi.restoreAllMocks();
  });

  it('should handle API error response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('Bad Request'),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await connector.executeToolCall('get_items', {}, { Authorization: 'Bearer test-key' });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('400');
    expect(result.error?.message).toBe('Bad Request');

    vi.restoreAllMocks();
  });

  it('should handle network error', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Connection refused'));
    vi.stubGlobal('fetch', mockFetch);

    const result = await connector.executeToolCall('get_items', {}, { Authorization: 'Bearer test-key' });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('NETWORK_ERROR');
    expect(result.error?.message).toBe('Connection refused');

    vi.restoreAllMocks();
  });
});
