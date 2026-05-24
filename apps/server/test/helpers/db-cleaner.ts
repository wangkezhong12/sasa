import postgres from 'postgres';

const TABLES = [
  'audit_logs',
  'messages',
  'conversations',
  'tool_definitions',
  'saas_bindings',
  'saas_connectors',
  'workspace_members',
  'workspaces',
  'llm_configs',
  'system_configs',
  'users',
];

export async function cleanDatabase(databaseUrl: string): Promise<void> {
  const client = postgres(databaseUrl);
  try {
    for (const table of TABLES) {
      await client.unsafe(`TRUNCATE TABLE sasa.${table} CASCADE`);
    }
  } finally {
    await client.end();
  }
}
