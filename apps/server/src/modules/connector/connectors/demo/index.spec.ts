import { DemoConnector } from './index';

describe('DemoConnector', () => {
  let connector: DemoConnector;

  beforeEach(() => {
    connector = new DemoConnector();
  });

  it('should have correct name and protocol', () => {
    expect(connector.name).toBe('Demo ERP');
    expect(connector.protocol).toBe('rest');
    expect(connector.version).toBe('1.0.0');
  });

  it('should return 2 tool definitions', () => {
    const tools = connector.getToolDefinitions();
    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe('submit_leave');
    expect(tools[1].name).toBe('query_leave_balance');
  });

  it('submit_leave should be write risk level', () => {
    const tool = connector.getToolDefinitions().find(t => t.name === 'submit_leave')!;
    expect(tool.riskLevel).toBe('write');
    expect(tool.requiredPermission).toBe('leave:submit');
  });

  it('query_leave_balance should be read risk level', () => {
    const tool = connector.getToolDefinitions().find(t => t.name === 'query_leave_balance')!;
    expect(tool.riskLevel).toBe('read');
  });

  it('should validate demo credentials', async () => {
    expect(await connector.validateCredentials('demo-key')).toBe(true);
    expect(await connector.validateCredentials('invalid')).toBe(false);
  });

  it('should fetch permissions', async () => {
    const perms = await connector.fetchPermissions('demo-key');
    expect(perms).toContain('leave:submit');
    expect(perms).toContain('leave:view');
    expect(perms).toContain('expense:create');
  });

  it('should return TOOL_NOT_FOUND for unknown tool', async () => {
    const result = await connector.executeToolCall('unknown_tool', {}, 'demo-key');
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('TOOL_NOT_FOUND');
  });
});
