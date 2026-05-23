# Sasa AI Agent — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个通过自然语言对话操作 SaaS 软件的 AI Agent 平台。

**Architecture:** TypeScript 全栈 Monorepo（Turborepo + pnpm）。后端 NestJS 单体模块化（Auth/Chat/Agent/Permission/Connector/Schema），前端 Next.js + shadcn/ui，PostgreSQL + Redis，Vercel AI SDK 集成多模型。

**Tech Stack:** NestJS, Next.js, Drizzle ORM, PostgreSQL, Redis, Vercel AI SDK, shadcn/ui, Tailwind CSS, NextAuth.js

**Spec:** `docs/superpowers/specs/2026-05-23-sasa-ai-agent-design.md`

---

## File Structure

```
sasa/
├── apps/
│   ├── web/                          # Next.js 15 前端
│   │   ├── src/
│   │   │   ├── app/                  # App Router
│   │   │   │   ├── (auth)/           # 登录/注册
│   │   │   │   ├── (main)/           # 主界面（含侧边栏布局）
│   │   │   │   │   ├── chat/         # 对话页
│   │   │   │   │   ├── saas/         # SaaS 管理
│   │   │   │   │   ├── workspace/    # 工作空间设置
│   │   │   │   │   └── settings/     # 个人设置
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── components/
│   │   │   │   ├── ui/              # shadcn/ui 组件
│   │   │   │   ├── chat/            # 聊天相关组件
│   │   │   │   ├── saas/            # SaaS 管理组件
│   │   │   │   └── layout/          # 布局组件
│   │   │   ├── lib/
│   │   │   │   ├── auth.ts          # NextAuth 配置
│   │   │   │   ├── api.ts           # API client
│   │   │   │   └── sse.ts           # SSE hook
│   │   │   └── hooks/
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── server/                       # NestJS 10 后端
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   │   ├── auth.module.ts
│       │   │   │   ├── auth.controller.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   ├── saas-binding.controller.ts
│       │   │   │   ├── saas-binding.service.ts
│       │   │   │   ├── workspace.controller.ts
│       │   │   │   ├── workspace.service.ts
│       │   │   │   ├── guards/
│       │   │   │   │   └── jwt.guard.ts
│       │   │   │   └── dto/
│       │   │   │       ├── register.dto.ts
│       │   │   │       ├── login.dto.ts
│       │   │   │       ├── create-workspace.dto.ts
│       │   │   │       └── bind-saas.dto.ts
│       │   │   ├── chat/
│       │   │   │   ├── chat.module.ts
│       │   │   │   ├── chat.controller.ts
│       │   │   │   ├── chat.service.ts
│       │   │   │   ├── conversation.service.ts
│       │   │   │   ├── sse.service.ts
│       │   │   │   └── dto/
│       │   │   │       ├── send-message.dto.ts
│       │   │   │       └── confirm-tool.dto.ts
│       │   │   ├── agent/
│       │   │   │   ├── agent.module.ts
│       │   │   │   ├── agent.service.ts
│       │   │   │   ├── tool-registry.service.ts
│       │   │   │   ├── prompt-builder.service.ts
│       │   │   │   ├── context-manager.service.ts
│       │   │   │   ├── confirmation-manager.service.ts
│       │   │   │   └── llm-config.service.ts
│       │   │   ├── permission/
│       │   │   │   ├── permission.module.ts
│       │   │   │   ├── permission.service.ts
│       │   │   │   └── audit.service.ts
│       │   │   ├── connector/
│       │   │   │   ├── connector.module.ts
│       │   │   │   ├── connector-registry.service.ts
│       │   │   │   ├── rest-connector.ts
│       │   │   │   └── connectors/
│       │   │   │       └── demo/
│       │   │   │           ├── index.ts
│       │   │   │           └── schema.ts
│       │   │   └── schema/
│       │   │       ├── schema.module.ts
│       │   │       ├── schema.service.ts
│       │   │       ├── schema-parser.service.ts
│       │   │       ├── tool-definition-builder.service.ts
│       │   │       ├── schema.controller.ts
│       │   │       └── dto/
│       │   │           └── upload-schema.dto.ts
│       │   ├── common/
│       │   │   ├── database/
│       │   │   │   ├── database.module.ts
│       │   │   │   └── schema.ts       # Drizzle 表定义
│       │   │   ├── redis/
│       │   │   │   └── redis.module.ts
│       │   │   └── crypto/
│       │   │       └── crypto.service.ts
│       │   ├── app.module.ts
│       │   └── main.ts
│       ├── test/
│       │   ├── app.e2e-spec.ts
│       │   └── jest-e2e.json
│       ├── nest-cli.json
│       ├── tsconfig.build.json
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   ├── shared/
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── connector.ts       # SaaSConnector, ToolDefinition 接口
│   │   │   │   ├── message.ts         # 消息/对话类型
│   │   │   │   ├── user.ts            # 用户/工作空间类型
│   │   │   │   ├── llm.ts             # LLM 配置类型
│   │   │   │   └── index.ts
│   │   │   └── constants.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── connector-sdk/
│       ├── src/
│       │   ├── base-connector.ts
│       │   ├── index.ts
│       │   └── types.ts
│       ├── package.json
│       └── tsconfig.json
├── docs/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example
└── .gitignore
```

---


## Chunk 2: 数据库与基础设施

### Task 6: 安装 Drizzle ORM 并配置数据库连接

- [ ] **Step 1: 安装依赖**

```bash
cd /Users/wangkezhong/claude_proj/sasa/apps/server && pnpm add drizzle-orm postgres dotenv && pnpm add -D drizzle-kit @types/pg
```

- [ ] **Step 2: 创建 apps/server/src/common/database/schema.ts — users 表**

```typescript
import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 3: 写测试验证 schema 定义**

```typescript
// apps/server/src/common/database/schema.spec.ts
import { describe, it, expect } from '@jest/globals';
import { users } from './schema';

describe('users schema', () => {
  it('should have required columns', () => {
    expect(users.id).toBeDefined();
    expect(users.email).toBeDefined();
    expect(users.name).toBeDefined();
    expect(users.createdAt).toBeDefined();
  });
});
```

- [ ] **Step 4: 运行测试**

```bash
cd /Users/wangkezhong/claude_proj/sasa/apps/server && pnpm test -- schema.spec
```

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: add users table schema with Drizzle"
```

### Task 7: 添加 workspaces 和 workspace_members 表

- [ ] **Step 1: 在 schema.ts 中追加表定义（与 users 同文件）**

```typescript
import { pgTable, uuid, varchar, jsonb, timestamp, boolean, unique, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  settingsJson: jsonb('settings_json').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceMembers = pgTable('workspace_members', {
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
```

- [ ] **Step 2: 写测试**

```typescript
// apps/server/src/common/database/schema-workspace.spec.ts
import { workspaces, workspaceMembers } from './schema';

describe('workspace schemas', () => {
  it('workspaces has required columns', () => {
    expect(workspaces.id).toBeDefined();
    expect(workspaces.slug).toBeDefined();
    expect(workspaces.ownerId).toBeDefined();
  });

  it('workspaceMembers has required columns', () => {
    expect(workspaceMembers.workspaceId).toBeDefined();
    expect(workspaceMembers.role).toBeDefined();
  });
});
```

- [ ] **Step 3: 运行测试，提交**

```bash
cd /Users/wangkezhong/claude_proj/sasa/apps/server && pnpm test -- schema-workspace.spec
git add -A && git commit -m "feat: add workspaces and workspace_members tables"
```

### Task 8: 添加 saas_connectors 表

- [ ] **Step 1: 追加到 schema.ts**

```typescript
export const saasConnectors = pgTable('saas_connectors', {
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
```

- [ ] **Step 2: 写测试，运行，提交**

同上模式。提交: `feat: add saas_connectors table`

### Task 9: 添加 saas_bindings 表

- [ ] **Step 1: 追加到 schema.ts**

```typescript
export const saasBindings = pgTable('saas_bindings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  connectorId: uuid('connector_id').notNull().references(() => saasConnectors.id),
  saasUserId: varchar('saas_user_id', { length: 255 }),
  saasUsername: varchar('saas_username', { length: 255 }),
  authType: varchar('auth_type', { length: 20 }).notNull(),
  encryptedCred: text('encrypted_cred').notNull(), // CryptoService 输出的 hex:hex:hex 格式
  permissionsJson: jsonb('permissions_json').default([]),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
}, (table) => [unique().on(table.userId, table.connectorId)]);
```

- [ ] **Step 2: 测试，提交**。`feat: add saas_bindings table`

### Task 10: 添加 conversations 表

```typescript
export const conversations = pgTable('conversations', {
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
```

提交: `feat: add conversations table`

### Task 11: 添加 messages 表

```typescript
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id),
  role: varchar('role', { length: 20 }).notNull(),
  content: text('content'),
  toolCallsJson: jsonb('tool_calls_json'),
  toolResultsJson: jsonb('tool_results_json'),
  confirmationId: uuid('confirmation_id'),
  tokensUsed: integer('tokens_used'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

提交: `feat: add messages table`

### Task 12: 添加 tool_definitions 表

```typescript
export const toolDefinitions = pgTable('tool_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  connectorId: uuid('connector_id').notNull().references(() => saasConnectors.id),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description').notNull(),
  parametersJson: jsonb('parameters_json').notNull(),
  requiredPermission: varchar('required_permission', { length: 100 }),
  riskLevel: varchar('risk_level', { length: 10 }).notNull().default('read'),
  apiMappingJson: jsonb('api_mapping_json').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

提交: `feat: add tool_definitions table`

### Task 13: 添加 audit_logs 表

```typescript
export const auditLogs = pgTable('audit_logs', {
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
```

提交: `feat: add audit_logs table`

### Task 14: 添加 llm_configs 和 system_configs 表

```typescript
export const llmConfigs = pgTable('llm_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  scope: varchar('scope', { length: 20 }).notNull(),
  scopeId: uuid('scope_id').notNull(),
  providerId: varchar('provider_id', { length: 50 }).notNull(),
  modelId: varchar('model_id', { length: 100 }).notNull(),
  apiKeyEncrypted: text('api_key_encrypted').notNull(), // CryptoService hex:hex:hex 格式
  baseUrl: text('base_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const systemConfigs = pgTable('system_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  scope: varchar('scope', { length: 20 }).notNull(),
  scopeId: uuid('scope_id').notNull(),
  key: varchar('key', { length: 100 }).notNull(),
  value: jsonb('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique().on(table.scope, table.scopeId, table.key)]);
```

提交: `feat: add llm_configs and system_configs tables`

### Task 15: 配置 Drizzle 迁移和数据库模块

- [ ] **Step 1: 创建 apps/server/drizzle.config.ts**

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/common/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 2: 创建 apps/server/src/common/database/database.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const DB_PROVIDER = 'DATABASE';

export const DB = DB_PROVIDER;

@Module({
  providers: [
    {
      provide: DB,
      useFactory: () => {
        const client = postgres(process.env.DATABASE_URL!);
        return drizzle(client, { schema });
      },
    },
  ],
  exports: [DB],
})
export class DatabaseModule {}
```

- [ ] **Step 3: 更新 app.module.ts 引入 DatabaseModule**

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from './common/database/database.module';

@Module({ imports: [DatabaseModule] })
export class AppModule {}
```

- [ ] **Step 4: 验证 drizzle-kit push**

```bash
cd /Users/wangkezhong/claude_proj/sasa/apps/server && pnpm drizzle-kit push
```

Expected: 数据库表创建成功

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: add DatabaseModule with Drizzle ORM connection"
```

### Task 16: 实现 CryptoService（AES-256-GCM 加解密）

- [ ] **Step 1: 写测试**

```typescript
// apps/server/src/common/crypto/crypto.service.spec.ts
import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    service = new CryptoService();
  });

  it('should encrypt and decrypt correctly', () => {
    const plaintext = 'my-secret-api-key';
    const encrypted = service.encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertexts for same plaintext', () => {
    const plaintext = 'same-input';
    const enc1 = service.encrypt(plaintext);
    const enc2 = service.encrypt(plaintext);
    expect(enc1).not.toBe(enc2);
    expect(service.decrypt(enc1)).toBe(plaintext);
    expect(service.decrypt(enc2)).toBe(plaintext);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd /Users/wangkezhong/claude_proj/sasa/apps/server && pnpm test -- crypto.service.spec
```

Expected: FAIL

- [ ] **Step 3: 实现 CryptoService**

```typescript
// apps/server/src/common/crypto/crypto.service.ts
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    const hexKey = process.env.ENCRYPTION_KEY;
    if (!hexKey) throw new Error('ENCRYPTION_KEY environment variable is required');
    this.key = Buffer.from(hexKey, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  decrypt(ciphertext: string): string {
    const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd /Users/wangkezhong/claude_proj/sasa/apps/server && pnpm test -- crypto.service.spec
```

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: add CryptoService with AES-256-GCM encryption"
```

### Task 17: 配置 Redis 模块

- [ ] **Step 1: 安装依赖**

```bash
cd /Users/wangkezhong/claude_proj/sasa/apps/server && pnpm add ioredis && pnpm add -D @types/ioredis
```

- [ ] **Step 2: 创建 apps/server/src/common/redis/redis.module.ts**

```typescript
import { Module, Global } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS = 'REDIS';

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      useFactory: () => {
        const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
        redis.on('error', (err) => console.error('Redis error:', err));
        return redis;
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
```

- [ ] **Step 3: 更新 app.module.ts 引入 RedisModule**

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from './common/database/database.module';
import { RedisModule } from './common/redis/redis.module';

@Module({ imports: [DatabaseModule, RedisModule] })
export class AppModule {}
```

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat: add RedisModule with ioredis"
```

---

