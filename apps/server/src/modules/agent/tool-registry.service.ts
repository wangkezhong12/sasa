import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '../../common/database/database.module';
import { toolDefinitions } from '../../common/database/schema';
import { TOOL_DEFINITION_THRESHOLD } from '@sasa/shared';

export interface ToolDefRow {
  id: string;
  name: string;
  description: string;
  parametersJson: Record<string, unknown>;
  requiredPermission: string | null;
  riskLevel: string;
  apiMappingJson: Record<string, unknown>;
}

export interface AITool {
  description: string;
  parameters: Record<string, unknown>;
}

@Injectable()
export class ToolRegistryService {
  constructor(@Inject(DB) private db: any) {}

  async getToolsForConnector(connectorId: string): Promise<ToolDefRow[]> {
    return this.db.select({
      id: toolDefinitions.id,
      name: toolDefinitions.name,
      description: toolDefinitions.description,
      parametersJson: toolDefinitions.parametersJson,
      requiredPermission: toolDefinitions.requiredPermission,
      riskLevel: toolDefinitions.riskLevel,
      apiMappingJson: toolDefinitions.apiMappingJson,
    }).from(toolDefinitions)
      .where(eq(toolDefinitions.connectorId, connectorId));
  }

  toAITools(tools: ToolDefRow[]): Record<string, AITool> {
    const result: Record<string, AITool> = {};
    for (const t of tools) {
      result[t.name] = {
        description: t.description,
        parameters: t.parametersJson,
      };
    }
    return result;
  }

  filterByThreshold(tools: ToolDefRow[], threshold = TOOL_DEFINITION_THRESHOLD): ToolDefRow[] {
    return tools.slice(0, threshold);
  }
}
