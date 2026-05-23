import { Injectable, BadRequestException } from '@nestjs/common';

export interface ParsedTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  riskLevel: 'read' | 'write' | 'delete';
  apiMapping: { method: string; path: string };
}

@Injectable()
export class SchemaParserService {
  parse(rawJson: string): { tools: ParsedTool[] } {
    let spec: any;
    try {
      spec = JSON.parse(rawJson);
    } catch {
      throw new BadRequestException('Invalid JSON');
    }

    if (!spec.openapi || !spec.paths) {
      throw new BadRequestException('Invalid OpenAPI document: missing openapi or paths');
    }

    const tools: ParsedTool[] = [];

    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(methods as any)) {
        if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
        const op = operation as any;

        tools.push({
          name: op.operationId || `${method}_${path.replace(/[{}\/]/g, '_')}`,
          description: op.summary || `${method.toUpperCase()} ${path}`,
          parameters: this.buildParameters(op),
          riskLevel: this.inferRiskLevel(method),
          apiMapping: { method: method.toUpperCase(), path },
        });
      }
    }

    return { tools };
  }

  private buildParameters(op: any): Record<string, unknown> {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    // Path/query/header parameters
    if (op.parameters) {
      for (const param of op.parameters) {
        properties[param.name] = param.schema || { type: 'string' };
        if (param.required) required.push(param.name);
      }
    }

    // Request body
    const bodySchema = op.requestBody?.content?.['application/json']?.schema;
    if (bodySchema) {
      if (bodySchema.properties) {
        Object.assign(properties, bodySchema.properties);
      }
      if (bodySchema.required) {
        required.push(...bodySchema.required);
      }
    }

    return {
      type: 'object',
      properties,
      ...(required.length > 0 ? { required } : {}),
    };
  }

  private inferRiskLevel(method: string): 'read' | 'write' | 'delete' {
    if (method === 'get') return 'read';
    if (method === 'delete') return 'delete';
    return 'write';
  }
}
