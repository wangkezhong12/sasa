import type { AuthType, AuthStrategyConfig } from './auth';

export interface SaaSConnector {
  name: string;
  version: string;
  protocol: 'rest' | 'mcp' | 'cli';
  supportedAuthTypes: AuthType[];
  getAuthStrategyConfig(authType: AuthType): AuthStrategyConfig | undefined;
  getToolDefinitions(): ConnectorToolDefinition[];
  executeToolCall(
    toolName: string,
    parameters: Record<string, unknown>,
    authHeaders: Record<string, string>,
  ): Promise<ToolResult>;
}

export interface ConnectorToolDefinition {
  name: string;
  displayName: string;
  description: string;
  parameters: Record<string, unknown>;
  requiredPermission: string;
  riskLevel: 'read' | 'write' | 'delete';
  apiMapping: {
    method: string;
    path: string;
    bodyMapping?: Record<string, string>;
    headerMapping?: Record<string, string>;
    queryMapping?: Record<string, string>;
  };
}

export interface ToolResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: { code: string; message: string };
}
