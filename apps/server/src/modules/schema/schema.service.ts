import { Injectable, Inject } from '@nestjs/common';
import { eq, or } from 'drizzle-orm';
import { DB } from '../../common/database/database.module';
import { saasConnectors, toolDefinitions } from '../../common/database/schema';
import { SchemaParserService } from './schema-parser.service';

@Injectable()
export class SchemaService {
  constructor(
    @Inject(DB) private db: any,
    private parser: SchemaParserService,
  ) {}

  async uploadAndParse(workspaceId: string | null, name: string, rawSchema: string) {
    const { tools } = this.parser.parse(rawSchema);
    const parsed = JSON.parse(rawSchema); // safe: parser already validated it's valid JSON

    const [connector] = await this.db.insert(saasConnectors).values({
      workspaceId,
      name,
      schemaJson: parsed,
      status: 'draft',
      isBuiltin: false,
    }).returning();

    for (const tool of tools) {
      await this.db.insert(toolDefinitions).values({
        connectorId: connector.id,
        name: tool.name,
        description: tool.description,
        parametersJson: tool.parameters,
        riskLevel: tool.riskLevel,
        apiMappingJson: tool.apiMapping,
      });
    }

    return connector;
  }

  async listConnectors(workspaceId: string | null) {
    // Return both builtin and workspace-scoped connectors
    // TODO(chunk-5): filter by workspace membership
    return this.db.select().from(saasConnectors);
  }

  async publishConnector(connectorId: string) {
    const [connector] = await this.db.update(saasConnectors)
      .set({ status: 'active' })
      .where(eq(saasConnectors.id, connectorId))
      .returning();
    return connector;
  }

  async updateTool(toolId: string, data: { riskLevel?: string; requiredPermission?: string }) {
    const [tool] = await this.db.update(toolDefinitions)
      .set(data)
      .where(eq(toolDefinitions.id, toolId))
      .returning();
    return tool;
  }

  async listTools(connectorId: string) {
    return this.db.select().from(toolDefinitions)
      .where(eq(toolDefinitions.connectorId, connectorId));
  }
}
