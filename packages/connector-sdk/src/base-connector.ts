import type { SaaSConnector, ConnectorToolDefinition, ToolResult } from '@sasa/shared';

export abstract class BaseRestConnector implements SaaSConnector {
  abstract name: string;
  abstract version: string;
  abstract supportedAuthTypes: ('oauth2' | 'api_key')[];
  protocol = 'rest' as const;

  abstract getBaseUrl(): string;
  abstract getToolDefinitions(): ConnectorToolDefinition[];
  abstract fetchPermissions(credentials: string): Promise<string[]>;
  abstract validateCredentials(credentials: string): Promise<boolean>;

  async executeToolCall(
    toolName: string,
    parameters: Record<string, unknown>,
    credentials: string,
  ): Promise<ToolResult> {
    const toolDef = this.getToolDefinitions().find((t) => t.name === toolName);
    if (!toolDef) {
      return { success: false, error: { code: 'TOOL_NOT_FOUND', message: `Tool ${toolName} not found` } };
    }

    const url = `${this.getBaseUrl()}${this.resolvePath(toolDef.apiMapping.path, parameters)}`;
    try {
      const response = await fetch(url, {
        method: toolDef.apiMapping.method,
        headers: {
          'Content-Type': 'application/json',
          ...this.buildAuthHeaders(credentials),
          ...this.buildMappedHeaders(toolDef.apiMapping.headerMapping, parameters),
        },
        body: toolDef.apiMapping.method !== 'GET' ? JSON.stringify(this.buildBody(toolDef, parameters)) : undefined,
      });

      if (!response.ok) {
        const body = await response.text();
        return { success: false, error: { code: String(response.status), message: body } };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: { code: 'NETWORK_ERROR', message: (error as Error).message } };
    }
  }

  private resolvePath(path: string, params: Record<string, unknown>): string {
    return path.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ''));
  }

  private buildAuthHeaders(credentials: string): Record<string, string> {
    return { Authorization: `Bearer ${credentials}` };
  }

  private buildMappedHeaders(mapping: Record<string, string> | undefined, params: Record<string, unknown>): Record<string, string> {
    if (!mapping) return {};
    const headers: Record<string, string> = {};
    for (const [headerName, paramKey] of Object.entries(mapping)) {
      if (params[paramKey] !== undefined) headers[headerName] = String(params[paramKey]);
    }
    return headers;
  }

  private buildBody(toolDef: ConnectorToolDefinition, params: Record<string, unknown>): Record<string, unknown> {
    if (!toolDef.apiMapping.bodyMapping) return params;
    const body: Record<string, unknown> = {};
    for (const [bodyKey, paramKey] of Object.entries(toolDef.apiMapping.bodyMapping)) {
      if (params[paramKey] !== undefined) body[bodyKey] = params[paramKey];
    }
    return body;
  }
}
