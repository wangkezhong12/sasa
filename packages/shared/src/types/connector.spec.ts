import { describe, it, expect } from 'vitest';
import type { SaaSConnector, ConnectorToolDefinition, ToolResult } from './connector';

describe('connector types', () => {
  it('SaaSConnector interface should define required methods', () => {
    const connector: SaaSConnector = {
      name: 'test',
      version: '1.0',
      protocol: 'rest',
      supportedAuthTypes: ['api_key'],
      getAuthStrategyConfig: () => ({ type: 'api_key', params: {} }),
      getToolDefinitions: () => [],
      executeToolCall: async (_toolName, _params, authHeaders) => ({ success: true }),
    };
    expect(connector.name).toBe('test');
    expect(connector.protocol).toBe('rest');
  });

  it('ConnectorToolDefinition should have required fields', () => {
    const toolDef: ConnectorToolDefinition = {
      name: 'get_orders',
      displayName: 'Get Orders',
      description: 'Fetch orders from ERP',
      parameters: { type: 'object', properties: {} },
      requiredPermission: 'orders:read',
      riskLevel: 'read',
      apiMapping: { method: 'GET', path: '/api/orders' },
    };
    expect(toolDef.riskLevel).toBe('read');
    expect(toolDef.apiMapping.method).toBe('GET');
  });

  it('ToolResult should represent success and error states', () => {
    const success: ToolResult = { success: true, data: { id: 1 } };
    const failure: ToolResult = { success: false, error: { code: '404', message: 'Not found' } };
    expect(success.success).toBe(true);
    expect(failure.error?.code).toBe('404');
  });
});
