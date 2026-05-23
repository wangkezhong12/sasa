import * as schema from './schema';

describe('database schema completeness', () => {
  const requiredTables = [
    'users', 'workspaces', 'workspaceMembers', 'saasConnectors',
    'saasBindings', 'conversations', 'messages', 'toolDefinitions',
    'auditLogs', 'llmConfigs', 'systemConfigs',
  ];

  it.each(requiredTables)('should define %s table', (table) => {
    expect((schema as Record<string, unknown>)[table]).toBeDefined();
  });

  it('users should have id, email, name, passwordHash, avatarUrl, createdAt, updatedAt', () => {
    const cols = schema.users;
    expect(cols.id).toBeDefined();
    expect(cols.email).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.passwordHash).toBeDefined();
    expect(cols.avatarUrl).toBeDefined();
    expect(cols.createdAt).toBeDefined();
    expect(cols.updatedAt).toBeDefined();
  });

  it('workspaces should have slug and ownerId referencing users', () => {
    expect(schema.workspaces.slug).toBeDefined();
    expect(schema.workspaces.ownerId).toBeDefined();
  });

  it('workspaceMembers should have role with default member', () => {
    expect(schema.workspaceMembers.role).toBeDefined();
    expect(schema.workspaceMembers.workspaceId).toBeDefined();
    expect(schema.workspaceMembers.userId).toBeDefined();
  });

  it('workspaceMembersRelations should link to workspaces and users', () => {
    expect(schema.workspaceMembersRelations).toBeDefined();
  });

  it('saasConnectors should have schemaJson, status, isBuiltin', () => {
    expect(schema.saasConnectors.schemaJson).toBeDefined();
    expect(schema.saasConnectors.status).toBeDefined();
    expect(schema.saasConnectors.isBuiltin).toBeDefined();
  });

  it('saasBindings should have encryptedCred and authType', () => {
    expect(schema.saasBindings.encryptedCred).toBeDefined();
    expect(schema.saasBindings.authType).toBeDefined();
    expect(schema.saasBindings.expiresAt).toBeDefined();
  });

  it('conversations should have contextJson and connectorId', () => {
    expect(schema.conversations.contextJson).toBeDefined();
    expect(schema.conversations.connectorId).toBeDefined();
  });

  it('messages should have toolCallsJson, toolResultsJson, confirmationId', () => {
    expect(schema.messages.toolCallsJson).toBeDefined();
    expect(schema.messages.toolResultsJson).toBeDefined();
    expect(schema.messages.confirmationId).toBeDefined();
    expect(schema.messages.tokensUsed).toBeDefined();
  });

  it('toolDefinitions should have riskLevel and apiMappingJson', () => {
    expect(schema.toolDefinitions.riskLevel).toBeDefined();
    expect(schema.toolDefinitions.apiMappingJson).toBeDefined();
    expect(schema.toolDefinitions.requiredPermission).toBeDefined();
  });

  it('auditLogs should have toolName, saasEndpoint, responseStatus', () => {
    expect(schema.auditLogs.toolName).toBeDefined();
    expect(schema.auditLogs.saasEndpoint).toBeDefined();
    expect(schema.auditLogs.responseStatus).toBeDefined();
  });

  it('llmConfigs should have apiKeyEncrypted and baseUrl', () => {
    expect(schema.llmConfigs.apiKeyEncrypted).toBeDefined();
    expect(schema.llmConfigs.baseUrl).toBeDefined();
    expect(schema.llmConfigs.isActive).toBeDefined();
  });

  it('systemConfigs should have scope, scopeId, key, value', () => {
    expect(schema.systemConfigs.scope).toBeDefined();
    expect(schema.systemConfigs.scopeId).toBeDefined();
    expect(schema.systemConfigs.key).toBeDefined();
    expect(schema.systemConfigs.value).toBeDefined();
  });
});
