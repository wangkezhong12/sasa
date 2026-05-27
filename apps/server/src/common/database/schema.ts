import {
  pgSchema,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
  customType,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

const sasa = pgSchema('sasa');

// Custom type for BYTEA columns that work with Buffer in JS
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

// ─── Users ───────────────────────────────────────────────

export const users = sasa.table('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  // bcrypt hash planned for chunk-3 auth module
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Workspaces ──────────────────────────────────────────

export const workspaces = sasa.table('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  settingsJson: jsonb('settings_json').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceMembers = sasa.table('workspace_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique().on(table.workspaceId, table.userId)]);

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, { fields: [workspaceMembers.workspaceId], references: [workspaces.id] }),
  user: one(users, { fields: [workspaceMembers.userId], references: [users.id] }),
}));

// ─── SaaS Connectors ─────────────────────────────────────
// workspaceId is nullable: NULL means builtin connector (not workspace-scoped)

export const saasConnectors = sasa.table('saas_connectors', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id'),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 10 }).notNull().default('rest'),
  version: varchar('version', { length: 20 }),
  schemaJson: jsonb('schema_json').notNull(),
  configJson: jsonb('config_json').default({}),
  isBuiltin: boolean('is_builtin').notNull().default(false),
  apiBaseUrl: text('api_base_url'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── SaaS Bindings ───────────────────────────────────────

export const saasBindings = sasa.table('saas_bindings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  connectorId: uuid('connector_id').notNull().references(() => saasConnectors.id),
  saasUserId: varchar('saas_user_id', { length: 255 }),
  saasUsername: varchar('saas_username', { length: 255 }),
  authType: varchar('auth_type', { length: 20 }).notNull(),
  encryptedCred: bytea('encrypted_cred').notNull(),
  permissionsJson: jsonb('permissions_json').default([]),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique().on(table.userId, table.connectorId)]);

// ─── Conversations ───────────────────────────────────────
// workspaceId/connectorId are nullable: personal chats may not have workspace context

export const conversations = sasa.table('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  workspaceId: uuid('workspace_id'),
  connectorId: uuid('connector_id'),
  title: varchar('title', { length: 255 }),
  contextJson: jsonb('context_json').default({}),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Messages ────────────────────────────────────────────

export const messages = sasa.table('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(),
  content: text('content'),
  toolCallsJson: jsonb('tool_calls_json'),
  toolResultsJson: jsonb('tool_results_json'),
  confirmationId: uuid('confirmation_id'),
  tokensUsed: integer('tokens_used'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Tool Definitions ────────────────────────────────────

export const toolDefinitions = sasa.table('tool_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  connectorId: uuid('connector_id').notNull().references(() => saasConnectors.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description').notNull(),
  parametersJson: jsonb('parameters_json').notNull(),
  requiredPermission: varchar('required_permission', { length: 100 }),
  riskLevel: varchar('risk_level', { length: 10 }).notNull().default('read'),
  apiMappingJson: jsonb('api_mapping_json').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Audit Logs ──────────────────────────────────────────
// Append-only: no UPDATE/DELETE at application or DB level

export const auditLogs = sasa.table('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  conversationId: uuid('conversation_id'),
  toolName: varchar('tool_name', { length: 100 }).notNull(),
  saasEndpoint: text('saas_endpoint').notNull(),
  requestJson: jsonb('request_json'),
  responseStatus: integer('response_status'),
  responseJson: jsonb('response_json'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── LLM Configs ─────────────────────────────────────────

export const llmConfigs = sasa.table('llm_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  scope: varchar('scope', { length: 20 }).notNull(),
  scopeId: uuid('scope_id').notNull(),
  providerId: varchar('provider_id', { length: 50 }).notNull(),
  modelId: varchar('model_id', { length: 100 }).notNull(),
  apiKeyEncrypted: bytea('api_key_encrypted').notNull(),
  baseUrl: text('base_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── System Configs ──────────────────────────────────────

export const systemConfigs = sasa.table('system_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  scope: varchar('scope', { length: 20 }).notNull(),
  scopeId: uuid('scope_id').notNull(),
  key: varchar('key', { length: 100 }).notNull(),
  value: jsonb('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique().on(table.scope, table.scopeId, table.key)]);
