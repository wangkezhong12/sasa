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

## Chunk 1: Monorepo 脚手架

### Task 1: 初始化 pnpm monorepo

- [ ] **Step 1: 创建根 package.json 和 pnpm-workspace.yaml**

```json
// package.json
{
  "name": "sasa",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test"
  },
  "devDependencies": {
    "turbo": "^2.5.0",
    "typescript": "^5.8.0"
  },
  "packageManager": "pnpm@10.11.0"
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 2: 创建 turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {
      "dependsOn": ["build"]
    }
  }
}
```

- [ ] **Step 3: 创建 .gitignore**

```
node_modules/
dist/
.turbo/
.env
*.local
.next/
```

- [ ] **Step 4: 创建 .env.example**

```
# PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sasa

# Redis
REDIS_URL=redis://localhost:6379

# Encryption
ENCRYPTION_KEY= # 32字节 hex 字符串，运行 openssl rand -hex 32 生成

# Auth
NEXTAUTH_SECRET= # 运行 openssl rand -base64 32 生成
NEXTAUTH_URL=http://localhost:3000

# Server
SERVER_PORT=4000
```

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "chore: init pnpm monorepo with turborepo"
```

### Task 2: 初始化 shared 包

- [ ] **Step 1: 创建 packages/shared/package.json**

```json
{
  "name": "@sasa/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "eslint src/",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "vitest": "^3.1.0"
  }
}
```

- [ ] **Step 2: 创建 packages/shared/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: 修复 shared 包 tsconfig 兼容性**

```json
// packages/shared/tsconfig.json — 使用 CommonJS 输出，兼容 NestJS 消费
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: 创建 packages/shared/src/types/connector.ts**

```typescript
export interface SaaSConnector {
  name: string;
  version: string;
  protocol: 'rest' | 'mcp' | 'cli';
  supportedAuthTypes: ('oauth2' | 'api_key')[];
  validateCredentials(credentials: string): Promise<boolean>;
  getToolDefinitions(): ConnectorToolDefinition[];
  fetchPermissions(credentials: string): Promise<string[]>;
  executeToolCall(
    toolName: string,
    parameters: Record<string, unknown>,
    credentials: string,
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
```

- [ ] **Step 4: 创建 packages/shared/src/types/message.ts**

```typescript
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string | null;
  toolCalls: ToolCall[] | null;
  toolResults: ToolResultData[] | null;
  confirmationId: string | null;
  createdAt: Date;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResultData {
  toolCallId: string;
  success: boolean;
  data?: Record<string, unknown>;
  error?: { code: string; message: string };
}

export type ConfirmationAction = 'confirm' | 'cancel' | 'modify';
```

- [ ] **Step 5: 创建 packages/shared/src/types/user.ts**

```typescript
export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  settings: Record<string, unknown>;
  createdAt: Date;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: Date;
}
```

- [ ] **Step 6: 创建 packages/shared/src/types/llm.ts**

```typescript
export type LLMProvider = 'openai' | 'anthropic' | 'deepseek' | 'custom';

export interface LLMConfig {
  id: string;
  scope: 'workspace' | 'user';
  scopeId: string;
  providerId: LLMProvider;
  modelId: string;
  baseUrl: string | null;
  isActive: boolean;
}

export interface LLMProviderOption {
  id: LLMProvider;
  name: string;
  defaultBaseUrl: string;
  models: { id: string; name: string }[];
}

export const LLM_PROVIDERS: LLMProviderOption[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    defaultBaseUrl: 'https://api.anthropic.com',
    models: [
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat' },
    ],
  },
  {
    id: 'custom',
    name: 'Custom Endpoint',
    defaultBaseUrl: '',
    models: [],
  },
];
```

- [ ] **Step 7: 创建 packages/shared/src/types/index.ts**

```typescript
export * from './connector';
export * from './message';
export * from './user';
export * from './llm';
```

- [ ] **Step 8: 创建 packages/shared/src/constants.ts**

```typescript
export const DEFAULT_CONFIRMATION_TIMEOUT_SECONDS = 300; // 5 minutes
export const MAX_TOOL_CALL_STEPS = 5;
export const CONTEXT_WINDOW_RECENT_ROUNDS = 10;
export const CONTEXT_WINDOW_BUDGET_RATIO = 0.8;
export const TOOL_DEFINITION_THRESHOLD = 50;
export const PERMISSION_CACHE_TTL_SECONDS = 1800; // 30 minutes
export const RATE_LIMIT_USER_PER_MIN = 20;
export const RATE_LIMIT_WORKSPACE_PER_MIN = 100;
export const AUDIT_LOG_RETENTION_DAYS = 90;
```

- [ ] **Step 9: 创建 packages/shared/src/index.ts**

```typescript
export * from './types';
export * from './constants';
```

- [ ] **Step 10: 安装依赖并验证**

```bash
cd /Users/wangkezhong/claude_proj/sasa && pnpm install
cd packages/shared && pnpm test
```

Expected: 测试运行（暂无测试文件，但包结构正确）

- [ ] **Step 11: 提交**

```bash
git add -A && git commit -m "feat: init @sasa/shared package with types and constants"
```

### Task 3: 初始化 NestJS 后端

- [ ] **Step 1: 创建 apps/server/package.json**

```json
{
  "name": "@sasa/server",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start": "node dist/main",
    "start:prod": "node dist/main",
    "lint": "eslint src/",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "@sasa/shared": "workspace:*",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.0",
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "typescript": "^5.8.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.3.0",
    "@types/jest": "^29.5.0",
    "ts-node": "^10.9.0"
  }
}
```

- [ ] **Step 2: 创建 apps/server/tsconfig.json**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2022",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

- [ ] **Step 3: 创建 apps/server/tsconfig.build.json**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "test", "**/*spec.ts"]
}
```

- [ ] **Step 4: 创建 apps/server/nest-cli.json**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src"
}
```

- [ ] **Step 5: 创建 apps/server/jest.config.js**

```javascript
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  collectCoverageFrom: ['**/*.ts', '!**/node_modules/**'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
};
```

- [ ] **Step 6: 创建 apps/server/src/main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const port = process.env.SERVER_PORT || 4000;
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
}
bootstrap();
```

- [ ] **Step 7: 创建 apps/server/src/app.module.ts**

```typescript
import { Module } from '@nestjs/common';

@Module({})
export class AppModule {}
```

- [ ] **Step 8: 创建 apps/server/test/jest-e2e.json**

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.ts$": "ts-jest" }
}
```

- [ ] **Step 9: 安装依赖并验证启动**

```bash
cd /Users/wangkezhong/claude_proj/sasa && pnpm install
cd apps/server && pnpm dev
```

Expected: `Server running on http://localhost:4000`

- [ ] **Step 10: 停止开发服务器，提交**

```bash
git add -A && git commit -m "feat: init NestJS server scaffold"
```

### Task 4: 初始化 Next.js 前端

- [ ] **Step 1: 使用 create-next-app 初始化**

```bash
cd /Users/wangkezhong/claude_proj/sasa/apps && pnpm create next-app@latest web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
```

- [ ] **Step 2: 安装 shadcn/ui**

```bash
cd /Users/wangkezhong/claude_proj/sasa/apps/web && pnpm dlx shadcn@latest init -d
```

- [ ] **Step 3: 安装额外依赖**

```bash
cd /Users/wangkezhong/claude_proj/sasa/apps/web && pnpm add @sasa/shared@workspace:* next-auth ai
```

- [ ] **Step 4: 清理默认页面，创建最小首页**

```typescript
// apps/web/src/app/page.tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-2xl font-bold">Sasa</h1>
    </main>
  );
}
```

- [ ] **Step 5: 验证启动**

```bash
cd /Users/wangkezhong/claude_proj/sasa/apps/web && pnpm dev
```

Expected: 浏览器访问 http://localhost:3000 看到 "Sasa"

- [ ] **Step 6: 停止开发服务器，提交**

```bash
cd /Users/wangkezhong/claude_proj/sasa && git add -A && git commit -m "feat: init Next.js frontend with shadcn/ui"
```

### Task 5: 初始化 connector-sdk 包

- [ ] **Step 1: 创建 packages/connector-sdk/package.json**

```json
{
  "name": "@sasa/connector-sdk",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "@sasa/shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "vitest": "^3.1.0"
  }
}
```

- [ ] **Step 2: 创建 packages/connector-sdk/tsconfig.json**

同 shared 包的 tsconfig.json

- [ ] **Step 3: 创建 packages/connector-sdk/src/types.ts**

```typescript
import type { SaaSConnector, ConnectorToolDefinition, ToolResult } from '@sasa/shared';

export type { SaaSConnector, ConnectorToolDefinition, ToolResult };
```

- [ ] **Step 4: 创建 packages/connector-sdk/src/base-connector.ts**

```typescript
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
```

- [ ] **Step 5: 创建 packages/connector-sdk/src/index.ts**

```typescript
export * from './types';
export { BaseRestConnector } from './base-connector';
```

- [ ] **Step 6: 安装依赖并验证**

```bash
cd /Users/wangkezhong/claude_proj/sasa && pnpm install
```

- [ ] **Step 7: 提交**

```bash
git add -A && git commit -m "feat: init @sasa/connector-sdk with BaseRestConnector"
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

## Chunk 3: Auth 模块

### Task 18: 用户注册接口

- [ ] **Step 1: 写测试**

```typescript
// apps/server/src/modules/auth/auth.service.spec.ts
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { DB } from '../../common/database/database.module';
import { CryptoService } from '../../common/crypto/crypto.service';

describe('AuthService.register', () => {
  let service: AuthService;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{
            id: 'user-1', email: 'test@test.com', name: 'Test', avatarUrl: null,
            createdAt: new Date(), updatedAt: new Date(),
          }]),
        }),
      }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue([]),
        }),
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        CryptoService,
        { provide: DB, useValue: mockDb },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('should register a new user and return user without password hash', async () => {
    const result = await service.register('test@test.com', 'password123', 'Test');
    expect(result.email).toBe('test@test.com');
    expect(result).not.toHaveProperty('passwordHash');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

- [ ] **Step 3: 实现 AuthService**

```typescript
// apps/server/src/modules/auth/auth.service.ts
import { Injectable, ConflictException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '../../common/database/database.module';
import { users } from '../../common/database/schema';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(@Inject(DB) private db: any) {}

  async register(email: string, password: string, name: string) {
    const existing = await this.db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) throw new ConflictException('Email already registered');

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    const [user] = await this.db.insert(users).values({ email, name, passwordHash }).returning();
    const { passwordHash: _, ...result } = user;
    return result;
  }
}
```

- [ ] **Step 4: 运行测试确认通过，提交**

```bash
git add -A && git commit -m "feat: add AuthService.register with email/password"
```

### Task 19: 用户登录接口（JWT）

- [ ] **Step 1: 安装 JWT 依赖**

```bash
cd /Users/wangkezhong/claude_proj/sasa/apps/server && pnpm add @nestjs/jwt @nestjs/passport passport passport-local passport-jwt && pnpm add -D @types/passport-local @types/passport-jwt
```

- [ ] **Step 2: 写测试**

```typescript
// auth.service.spec.ts 追加
it('should login with correct credentials and return JWT', async () => {
  mockDb.select = jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([{
        id: 'user-1', email: 'test@test.com', name: 'Test', passwordHash: crypto.createHash('sha256').update('password123').digest('hex'),
      }]),
    }),
  });
  const result = await service.login('test@test.com', 'password123');
  expect(result.accessToken).toBeDefined();
});
```

- [ ] **Step 3: 实现 login 方法 + JwtGuard**

```typescript
// auth.service.ts 追加
async login(email: string, password: string) {
  const [user] = await this.db.select().from(users).where(eq(users.email, email));
  if (!user) throw new UnauthorizedException('Invalid credentials');
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  if (hash !== user.passwordHash) throw new UnauthorizedException('Invalid credentials');
  const payload = { sub: user.id, email: user.email };
  return { accessToken: this.jwtService.sign(payload), user: { id: user.id, email: user.email, name: user.name } };
}
```

- [ ] **Step 4: 创建 JWT Guard**

```typescript
// apps/server/src/modules/auth/guards/jwt.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 5: 测试通过，提交**

```bash
git add -A && git commit -m "feat: add AuthService.login with JWT authentication"
```

### Task 20: Auth Controller（注册/登录 API 端点）

- [ ] **Step 1: 创建 DTO**

```typescript
// apps/server/src/modules/auth/dto/register.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';
export class RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsString() name: string;
}
```

```typescript
// apps/server/src/modules/auth/dto/login.dto.ts
import { IsEmail, IsString } from 'class-validator';
export class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}
```

- [ ] **Step 2: 创建 AuthController**

```typescript
// apps/server/src/modules/auth/auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password, dto.name);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }
}
```

- [ ] **Step 3: 创建 AuthModule 注册所有 providers**

```typescript
// apps/server/src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.NEXTAUTH_SECRET || 'dev-secret', signOptions: { expiresIn: '7d' } }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
```

- [ ] **Step 4: 更新 app.module.ts 引入 AuthModule**

- [ ] **Step 5: 验证 API**

```bash
curl -X POST http://localhost:4000/auth/register -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"123456","name":"Test"}'
```

Expected: 返回用户信息

- [ ] **Step 6: 提交**

```bash
git add -A && git commit -m "feat: add AuthController with register/login endpoints"
```

### Task 21: Workspace CRUD 接口

- [ ] **Step 1: 创建 WorkspaceService + 测试**

```typescript
// workspace.service.ts
async create(name: string, ownerId: string) {
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString(36);
  const [workspace] = await this.db.insert(workspaces).values({ name, slug, ownerId }).returning();
  await this.db.insert(workspaceMembers).values({ workspaceId: workspace.id, userId: ownerId, role: 'owner' });
  return workspace;
}

async findByUser(userId: string) {
  return this.db.select({ workspace: workspaces, role: workspaceMembers.role })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId));
}

async addMember(workspaceId: string, userId: string, role: 'admin' | 'member' = 'member') {
  return this.db.insert(workspaceMembers).values({ workspaceId, userId, role }).returning();
}
```

- [ ] **Step 2: 创建 WorkspaceController**

```typescript
@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspaceController {
  @Post() create(...) {}
  @Get() list(...) {}
  @Post(':id/members') addMember(...) {}
  @Get(':id/members') listMembers(...) {}
}
```

- [ ] **Step 3: 注册到 AuthModule（或独立 WorkspaceModule），提交**

```bash
git add -A && git commit -m "feat: add Workspace CRUD endpoints"
```

### Task 22: SaaS 账号绑定接口（API Key 方式）

- [ ] **Step 1: 创建 BindSaasDto**

```typescript
export class BindSaasDto {
  @IsString() connectorId: string;
  @IsString() authType: 'oauth2' | 'api_key';
  @IsString() credential: string;     // API Key 或 OAuth code
  @IsOptional() @IsString() saasUserId?: string;
  @IsOptional() @IsString() saasUsername?: string;
}
```

- [ ] **Step 2: 实现 SaaSBindingService**

```typescript
// saas-binding.service.ts
async bind(userId: string, dto: BindSaasDto) {
  const encrypted = this.crypto.encrypt(dto.credential);
  // 验证凭证
  const connector = this.connectorRegistry.get(dto.connectorId);
  const valid = await connector.validateCredentials(dto.credential);
  if (!valid) throw new UnauthorizedException('Invalid credentials');
  // 同步权限
  const permissions = await connector.fetchPermissions(dto.credential);
  // 存储
  const [binding] = await this.db.insert(saasBindings).values({
    userId, connectorId: dto.connectorId, authType: dto.authType,
    encryptedCred: encrypted, permissionsJson: permissions,
    saasUserId: dto.saasUserId, saasUsername: dto.saasUsername,
  }).returning();
  return binding;
}

async getBindings(userId: string) {
  return this.db.select().from(saasBindings).where(eq(saasBindings.userId, userId));
}

async unbind(userId: string, bindingId: string) {
  await this.db.delete(saasBindings).where(and(eq(saasBindings.id, bindingId), eq(saasBindings.userId, userId)));
}
```

- [ ] **Step 3: 创建 SaaSBindingController**

```typescript
@Controller('saas-bindings')
@UseGuards(JwtAuthGuard)
export class SaaSBindingController {
  @Post() bind(...) {}
  @Get() list(...) {}
  @Delete(':id') unbind(...) {}
}
```

- [ ] **Step 4: 测试，提交**

```bash
git add -A && git commit -m "feat: add SaaS account binding API (API Key flow)"
```

---

## Chunk 4: Connector & Schema 模块

### Task 23: ConnectorRegistry 服务

- [ ] **Step 1: 写测试**

```typescript
describe('ConnectorRegistry', () => {
  it('should register and retrieve a connector', () => {
    const registry = new ConnectorRegistry();
    const connector = new DemoConnector();
    registry.register('demo', connector);
    expect(registry.get('demo')).toBe(connector);
  });

  it('should list all registered connectors', () => {
    const registry = new ConnectorRegistry();
    registry.register('demo-1', connector1);
    registry.register('demo-2', connector2);
    expect(registry.list()).toHaveLength(2);
  });

  it('should throw when getting unregistered connector', () => {
    const registry = new ConnectorRegistry();
    expect(() => registry.get('nonexistent')).toThrow();
  });
});
```

- [ ] **Step 2: 实现 ConnectorRegistry**

```typescript
// connector-registry.service.ts
@Injectable()
export class ConnectorRegistry {
  private connectors = new Map<string, SaaSConnector>();

  register(id: string, connector: SaaSConnector) { this.connectors.set(id, connector); }
  get(id: string): SaaSConnector {
    const c = this.connectors.get(id);
    if (!c) throw new NotFoundException(`Connector ${id} not found`);
    return c;
  }
  list(): { id: string; connector: SaaSConnector }[] {
    return Array.from(this.connectors.entries()).map(([id, connector]) => ({ id, connector }));
  }
}
```

- [ ] **Step 3: 测试通过，提交**

```bash
git add -A && git commit -m "feat: add ConnectorRegistry service"
```

### Task 24: Demo 连接器（用于开发测试）

- [ ] **Step 1: 实现 DemoConnector**

```typescript
// connector/connectors/demo/index.ts
export class DemoConnector extends BaseRestConnector {
  name = 'Demo ERP';
  version = '1.0.0';
  supportedAuthTypes = ['api_key'] as const;

  getBaseUrl() { return 'https://demo-erp.example.com/api'; }

  getToolDefinitions(): ConnectorToolDefinition[] {
    return [
      {
        name: 'submit_leave',
        displayName: '提交请假申请',
        description: '提交一个请假申请到 ERP 系统',
        parameters: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['annual', 'sick', 'personal'], description: '假期类型' },
            startDate: { type: 'string', format: 'date', description: '开始日期' },
            endDate: { type: 'string', format: 'date', description: '结束日期' },
            reason: { type: 'string', description: '请假原因' },
          },
          required: ['type', 'startDate', 'endDate'],
        },
        requiredPermission: 'leave:submit',
        riskLevel: 'write',
        apiMapping: { method: 'POST', path: '/leaves' },
      },
      {
        name: 'query_leave_balance',
        displayName: '查询假期余额',
        description: '查询当前用户的假期余额',
        parameters: { type: 'object', properties: {} },
        requiredPermission: 'leave:view',
        riskLevel: 'read',
        apiMapping: { method: 'GET', path: '/leaves/balance' },
      },
    ];
  }

  async validateCredentials(credentials: string): Promise<boolean> {
    return credentials.startsWith('demo-');
  }

  async fetchPermissions(credentials: string): Promise<string[]> {
    return ['leave:submit', 'leave:view', 'expense:create'];
  }
}
```

- [ ] **Step 2: 写测试验证 DemoConnector 的 Tool Definitions**

```typescript
describe('DemoConnector', () => {
  it('should return tool definitions', () => {
    const connector = new DemoConnector();
    const tools = connector.getToolDefinitions();
    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe('submit_leave');
  });

  it('should validate demo credentials', async () => {
    const connector = new DemoConnector();
    expect(await connector.validateCredentials('demo-key')).toBe(true);
    expect(await connector.validateCredentials('invalid')).toBe(false);
  });
});
```

- [ ] **Step 3: 测试通过，提交**

```bash
git add -A && git commit -m "feat: add DemoConnector for development testing"
```

### Task 25: Schema 解析服务（OpenAPI → ToolDefinition）

- [ ] **Step 1: 写测试**

```typescript
describe('SchemaParserService', () => {
  it('should parse a valid OpenAPI 3.0 document', () => {
    const parser = new SchemaParserService();
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/pets': {
          get: { operationId: 'listPets', summary: 'List pets', parameters: [], responses: { '200': { description: 'OK' } } },
          post: { operationId: 'createPet', summary: 'Create a pet', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } } } }, responses: { '201': { description: 'Created' } } },
        },
      },
    };
    const result = parser.parse(JSON.stringify(spec));
    expect(result.tools).toHaveLength(2);
    expect(result.tools[0].name).toBe('listPets');
    expect(result.tools[0].riskLevel).toBe('read');
    expect(result.tools[1].riskLevel).toBe('write');
  });

  it('should reject invalid OpenAPI documents', () => {
    const parser = new SchemaParserService();
    expect(() => parser.parse('{ invalid json')).toThrow();
    expect(() => parser.parse('{"not": "openapi"}')).toThrow();
  });
});
```

- [ ] **Step 2: 实现 SchemaParserService**

```typescript
// schema-parser.service.ts
@Injectable()
export class SchemaParserService {
  parse(rawJson: string): { tools: ParsedTool[] } {
    let spec: any;
    try { spec = JSON.parse(rawJson); } catch { throw new BadRequestException('Invalid JSON'); }
    if (!spec.openapi || !spec.paths) throw new BadRequestException('Invalid OpenAPI document: missing openapi or paths');
    const tools: ParsedTool[] = [];
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(methods as any)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
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
    }
    return { tools };
  }

  private buildParameters(op: any): Record<string, unknown> { /* 从 parameters + requestBody 构建 JSON Schema */ }
  private inferRiskLevel(method: string): 'read' | 'write' | 'delete' {
    if (method === 'get') return 'read';
    if (method === 'delete') return 'delete';
    return 'write';
  }
}
```

- [ ] **Step 3: 测试通过，提交**

```bash
git add -A && git commit -m "feat: add SchemaParserService for OpenAPI to ToolDefinition conversion"
```

### Task 26: Schema 上传与管理 API

- [ ] **Step 1: 创建 SchemaController**

```typescript
@Controller('schemas')
@UseGuards(JwtAuthGuard)
export class SchemaController {
  @Post('upload') upload(@Body() dto: UploadSchemaDto, @Req() req) { /* 解析 + 保存到 saas_connectors (draft) + 生成 tool_definitions */ }
  @Get('connectors') listConnectors(@Req() req) { /* 列出工作空间内连接器 */ }
  @Post('connectors/:id/publish') publish(@Param('id') id, @Req() req) { /* draft → active */ }
  @Patch('tools/:id') updateTool(@Param('id') id, @Body() dto) { /* 配置 requiredPermission 和 riskLevel */ }
}
```

- [ ] **Step 2: 实现 SchemaService**

```typescript
@Injectable()
export class SchemaService {
  async uploadAndParse(workspaceId: string | null, name: string, rawSchema: string) {
    const { tools } = this.parser.parse(rawSchema);
    const [connector] = await this.db.insert(saasConnectors).values({
      workspaceId, name, schemaJson: JSON.parse(rawSchema), status: 'draft', isBuiltin: false,
    }).returning();
    for (const tool of tools) {
      await this.db.insert(toolDefinitions).values({
        connectorId: connector.id, name: tool.name, description: tool.description,
        parametersJson: tool.parameters, riskLevel: tool.riskLevel, apiMappingJson: tool.apiMapping,
      });
    }
    return connector;
  }
}
```

- [ ] **Step 3: 测试，提交**

```bash
git add -A && git commit -m "feat: add Schema upload and management API"
```

---

## Chunk 5: Permission 模块

### Task 27: PermissionService（权限过滤）

- [ ] **Step 1: 写测试**

```typescript
describe('PermissionService', () => {
  it('should filter tools by user permissions', () => {
    const service = new PermissionService(null, null, null);
    const tools = [
      { name: 'a', requiredPermission: 'leave:submit' },
      { name: 'b', requiredPermission: 'leave:approve' },
      { name: 'c', requiredPermission: 'expense:create' },
    ];
    const filtered = service.filterTools(tools, ['leave:submit', 'expense:create']);
    expect(filtered).toHaveLength(2);
    expect(filtered.map(t => t.name)).toEqual(['a', 'c']);
  });
});
```

- [ ] **Step 2: 实现 PermissionService**

```typescript
@Injectable()
export class PermissionService {
  constructor(@Inject(DB) private db: any, @Inject(REDIS) private redis: Redis, private crypto: CryptoService) {}

  filterTools<T extends { requiredPermission: string }>(tools: T[], permissions: string[]): T[] {
    return tools.filter((t) => !t.requiredPermission || permissions.includes(t.requiredPermission));
  }

  async getPermissions(userId: string, connectorId: string): Promise<string[]> {
    const cacheKey = `permissions:${userId}:${connectorId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    const [binding] = await this.db.select().from(saasBindings)
      .where(and(eq(saasBindings.userId, userId), eq(saasBindings.connectorId, connectorId)));
    if (!binding) return [];
    const permissions = binding.permissionsJson as string[];
    await this.redis.set(cacheKey, JSON.stringify(permissions), 'EX', PERMISSION_CACHE_TTL_SECONDS);
    return permissions;
  }

  async syncPermissions(userId: string, connectorId: string): Promise<string[]> {
    const [binding] = await this.db.select().from(saasBindings)
      .where(and(eq(saasBindings.userId, userId), eq(saasBindings.connectorId, connectorId)));
    if (!binding) return [];
    const connector = this.connectorRegistry.get(connectorId);
    const cred = this.crypto.decrypt(binding.encryptedCred);
    const permissions = await connector.fetchPermissions(cred);
    await this.db.update(saasBindings).set({ permissionsJson: permissions })
      .where(eq(saasBindings.id, binding.id));
    const cacheKey = `permissions:${userId}:${connectorId}`;
    await this.redis.set(cacheKey, JSON.stringify(permissions), 'EX', PERMISSION_CACHE_TTL_SECONDS);
    return permissions;
  }
}
```

- [ ] **Step 3: 测试通过，提交**

```bash
git add -A && git commit -m "feat: add PermissionService with tool filtering and Redis cache"
```

### Task 28: AuditService（审计日志）

- [ ] **Step 1: 写测试**

```typescript
describe('AuditService', () => {
  it('should create an audit log entry', async () => {
    const mockDb = { insert: jest.fn().mockReturnValue({ values: jest.fn().mockResolvedValue([{ id: 'log-1' }]) }) };
    const service = new AuditService(mockDb);
    await service.log({
      userId: 'u1', toolName: 'submit_leave', saasEndpoint: '/api/leaves',
      requestJson: { type: 'annual' }, responseStatus: 200, responseJson: { id: 'LV001' },
    });
    expect(mockDb.insert).toHaveBeenCalledWith(auditLogs);
  });
});
```

- [ ] **Step 2: 实现 AuditService（仅 create + find）**

```typescript
@Injectable()
export class AuditService {
  constructor(@Inject(DB) private db: any) {}

  async log(entry: { userId: string; conversationId?: string; toolName: string; saasEndpoint: string; requestJson?: any; responseStatus?: number; responseJson?: any }) {
    await this.db.insert(auditLogs).values(entry);
  }

  async findByUser(userId: string, limit = 50) {
    return this.db.select().from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }
}
```

- [ ] **Step 3: 测试通过，提交**

```bash
git add -A && git commit -m "feat: add AuditService with append-only logging"
```

---

## Chunk 6: Agent Engine

### Task 29: LLM 配置加载服务

- [ ] **Step 1: 写测试**

```typescript
describe('LLMConfigService', () => {
  it('should resolve user config over workspace config', async () => {
    const service = new LLMConfigService(mockDb, mockCrypto);
    mockDb.select.mockReturnValue({ from: jest.fn().mockReturnValue({
      where: jest.fn()
        .mockResolvedValueOnce([{ providerId: 'openai', modelId: 'gpt-4o', apiKeyEncrypted: 'enc-user', baseUrl: null }])
        .mockResolvedValueOnce([{ providerId: 'anthropic', modelId: 'claude-sonnet-4-6', apiKeyEncrypted: 'enc-ws', baseUrl: null }]),
    })});
    const config = await service.resolve('user-1', 'ws-1');
    expect(config.providerId).toBe('openai'); // 用户配置优先
  });
});
```

- [ ] **Step 2: 实现 LLMConfigService**

```typescript
@Injectable()
export class LLMConfigService {
  async resolve(userId: string, workspaceId?: string): Promise<ResolvedLLMConfig> {
    // 查找顺序: user → workspace → 抛异常引导配置
    let config = await this.findActive('user', userId);
    if (!config && workspaceId) config = await this.findActive('workspace', workspaceId);
    if (!config) throw new BadRequestException('LLM not configured. Please set up your API key.');
    return { ...config, apiKey: this.crypto.decrypt(config.apiKeyEncrypted) };
  }
}
```

- [ ] **Step 3: 测试通过，提交**

```bash
git add -A && git commit -m "feat: add LLMConfigService with user/workspace config resolution"
```

### Task 30: Prompt 构建服务

- [ ] **Step 1: 写测试**

```typescript
describe('PromptBuilderService', () => {
  it('should build system prompt with context', () => {
    const service = new PromptBuilderService();
    const prompt = service.buildSystemPrompt({
      saasName: 'Demo ERP', userName: '张三', userRole: '普通员工',
      customInstructions: '日期格式为 yyyy-MM-dd',
    });
    expect(prompt).toContain('Demo ERP');
    expect(prompt).toContain('张三');
    expect(prompt).toContain('yyyy-MM-dd');
  });
});
```

- [ ] **Step 2: 实现 PromptBuilderService**

```typescript
@Injectable()
export class PromptBuilderService {
  buildSystemPrompt(ctx: { saasName: string; userName: string; userRole: string; currentTime?: string; customInstructions?: string }): string {
    return [
      `你是一个 SaaS 操作助手。当前连接的 SaaS 系统是: ${ctx.saasName}`,
      `用户: ${ctx.userName} (角色: ${ctx.userRole})`,
      `当前时间: ${ctx.currentTime || new Date().toISOString()}`,
      '',
      '操作约束:',
      '- 执行操作前必须确认参数完整性，如用户表述不清晰，主动追问',
      '- 只使用提供的工具，不要编造参数值',
      '- 如遇到错误，用自然语言解释并建议下一步',
      ctx.customInstructions ? `\nSaaS 专属指令:\n${ctx.customInstructions}` : '',
    ].join('\n');
  }
}
```

- [ ] **Step 3: 测试通过，提交**

```bash
git add -A && git commit -m "feat: add PromptBuilderService for dynamic system prompts"
```

### Task 31: 上下文窗口管理服务

- [ ] **Step 1: 写测试**

```typescript
describe('ContextManagerService', () => {
  it('should trim messages to recent N rounds', () => {
    const service = new ContextManagerService();
    const messages = Array.from({ length: 30 }, (_, i) => ({ role: 'user', content: `msg ${i}` }));
    const trimmed = service.trim(messages, { maxRounds: 10 });
    expect(trimmed.length).toBeLessThanOrEqual(20); // 10 rounds = 20 messages
  });
});
```

- [ ] **Step 2: 实现 ContextManagerService**

```typescript
@Injectable()
export class ContextManagerService {
  trim(messages: CoreMessage[], opts: { maxRounds?: number } = {}): CoreMessage[] {
    const maxRounds = opts.maxRounds ?? CONTEXT_WINDOW_RECENT_ROUNDS;
    return messages.slice(-maxRounds * 2); // 每轮约 2 条消息
  }
}
```

- [ ] **Step 3: 测试通过，提交**

```bash
git add -A && git commit -m "feat: add ContextManagerService for message trimming"
```

### Task 32: ConfirmationManager（待确认管理）

- [ ] **Step 1: 写测试**

```typescript
describe('ConfirmationManager', () => {
  it('should create pending confirmation and resolve on confirm', async () => {
    const manager = new ConfirmationManager();
    const promise = manager.create('conf-1', 5000);
    manager.resolve('conf-1', { action: 'confirm' });
    const result = await promise;
    expect(result.action).toBe('confirm');
  });

  it('should auto-cancel on timeout', async () => {
    jest.useFakeTimers();
    const manager = new ConfirmationManager();
    const promise = manager.create('conf-2', 100);
    jest.advanceTimersByTime(150);
    const result = await promise;
    expect(result.action).toBe('cancel');
    jest.useRealTimers();
  });
});
```

- [ ] **Step 2: 实现 ConfirmationManager**

```typescript
@Injectable()
export class ConfirmationManager {
  private pending = new Map<string, { timer: NodeJS.Timeout; resolve: (v: any) => void }>();

  create(id: string, timeoutMs: number): Promise<{ action: ConfirmationAction; modifiedParameters?: Record<string, unknown> }> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve({ action: 'cancel' });
      }, timeoutMs);
      this.pending.set(id, { timer, resolve });
    });
  }

  resolve(id: string, result: { action: ConfirmationAction; modifiedParameters?: Record<string, unknown> }) {
    const pending = this.pending.get(id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(id);
    pending.resolve(result);
  }
}
```

- [ ] **Step 3: 测试通过，提交**

```bash
git add -A && git commit -m "feat: add ConfirmationManager with timeout handling"
```

### Task 33: ToolRegistry（工具注册 + 查询）

- [ ] **Step 1: 写测试**

```typescript
describe('ToolRegistry', () => {
  it('should load tools from database for a connector', async () => {
    const mockDb = { select: jest.fn().mockReturnValue({ from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([toolDef1, toolDef2]) }) }) };
    const registry = new ToolRegistry(mockDb);
    const tools = await registry.getToolsForConnector('connector-1');
    expect(tools).toHaveLength(2);
  });

  it('should convert to Vercel AI SDK tool format', () => {
    const registry = new ToolRegistry(null);
    const aiTools = registry.toAITools([toolDef1]);
    expect(aiTools['submit_leave']).toBeDefined();
    expect(aiTools['submit_leave'].description).toBe('提交请假申请');
  });
});
```

- [ ] **Step 2: 实现 ToolRegistry**

```typescript
@Injectable()
export class ToolRegistry {
  async getToolsForConnector(connectorId: string): Promise<ToolDefRow[]> {
    return this.db.select().from(toolDefinitions).where(eq(toolDefinitions.connectorId, connectorId));
  }

  toAITools(tools: ToolDefRow[]): Record<string, CoreTool> {
    const result: Record<string, CoreTool> = {};
    for (const t of tools) {
      result[t.name] = {
        description: t.description,
        parameters: t.parametersJson as any,
      };
    }
    return result;
  }
}
```

- [ ] **Step 3: 测试通过，提交**

```bash
git add -A && git commit -m "feat: add ToolRegistry for loading and converting tool definitions"
```

### Task 34: AgentService（核心编排）

- [ ] **Step 1: 写测试**

```typescript
describe('AgentService.processMessage', () => {
  it('should call LLM and return text response', async () => {
    // mock Vercel AI SDK streamText
    const service = new AgentService(mockLLMConfig, mockPromptBuilder, mockContextManager, mockPermission, mockToolRegistry, mockConfirmationManager, mockAudit, mockConnectorRegistry, mockCrypto, mockDb);
    const result = await service.processMessage({ userId: 'u1', conversationId: 'c1', message: '你好', connectorId: 'demo' });
    expect(result.type).toBe('text');
  });
});
```

- [ ] **Step 2: 实现 AgentService.processMessage**

```typescript
@Injectable()
export class AgentService {
  async processMessage(params: { userId: string; conversationId: string; message: string; connectorId: string }) {
    // 1. 加载 LLM 配置
    const llmConfig = await this.llmConfigService.resolve(params.userId);
    // 2. 加载工具（权限过滤后）
    const allTools = await this.toolRegistry.getToolsForConnector(params.connectorId);
    const permissions = await this.permissionService.getPermissions(params.userId, params.connectorId);
    const filteredTools = this.permissionService.filterTools(allTools, permissions);
    const aiTools = this.toolRegistry.toAITools(filteredTools);
    // 3. 构建上下文
    const history = await this.loadHistory(params.conversationId);
    const trimmed = this.contextManager.trim(history);
    const systemPrompt = this.promptBuilder.buildSystemPrompt({...});
    // 4. 调用 LLM
    const result = await streamText({ model: loadModel(llmConfig), system: systemPrompt, messages: trimmed, tools: aiTools, maxSteps: MAX_TOOL_CALL_STEPS });
    // 5. 处理结果（文本 / tool call / 确认请求）
    // ... 流式返回
  }
}
```

- [ ] **Step 3: 测试通过，提交**

```bash
git add -A && git commit -m "feat: add AgentService with LLM orchestration"
```

---

## Chunk 7: Chat Gateway

### Task 35: Conversation 服务（CRUD）

- [ ] **Step 1: 实现 ConversationService**

```typescript
@Injectable()
export class ConversationService {
  async create(userId: string, connectorId?: string, workspaceId?: string) {
    const [conv] = await this.db.insert(conversations).values({ userId, connectorId, workspaceId }).returning();
    return conv;
  }
  async findByUser(userId: string) { return this.db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(desc(conversations.updatedAt)); }
  async findById(id: string) { const [c] = await this.db.select().from(conversations).where(eq(conversations.id, id)); return c; }
  async updateTitle(id: string, title: string) { return this.db.update(conversations).set({ title }).where(eq(conversations.id, id)); }
}
```

- [ ] **Step 2: 测试，提交**

```bash
git add -A && git commit -m "feat: add ConversationService CRUD"
```

### Task 36: SSE 服务（流式推送）

- [ ] **Step 1: 写测试**

```typescript
describe('SSEService', () => {
  it('should create observable stream for a client', () => {
    const service = new SSEService();
    const observable = service.createStream('client-1');
    expect(observable).toBeDefined();
  });

  it('should push events to client', (done) => {
    const service = new SSEService();
    const observable = service.createStream('client-1');
    observable.subscribe({ next: (event) => { expect(event.data).toBe('hello'); done(); } });
    service.push('client-1', { event: 'message', data: 'hello' });
  });
});
```

- [ ] **Step 2: 实现 SSEService**

```typescript
@Injectable()
export class SSEService {
  private clients = new Map<string, Subject<{ event: string; data: string }>>();

  createStream(clientId: string): Observable<MessageEvent> {
    const subject = new Subject<{ event: string; data: string }>();
    this.clients.set(clientId, subject);
    return subject.asObservable().pipe(
      map(({ event, data }) => new MessageEvent(event, { data })),
      finalize(() => this.clients.delete(clientId)),
    );
  }

  push(clientId: string, event: { event: string; data: string }) {
    this.clients.get(clientId)?.next(event);
  }
}
```

- [ ] **Step 3: 测试通过，提交**

```bash
git add -A && git commit -m "feat: add SSEService for streaming events"
```

### Task 37: Chat Controller（对话 API）

- [ ] **Step 1: 创建 ChatController**

```typescript
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  @Post('conversations') createConversation(...) {}
  @Get('conversations') listConversations(...) {}
  @Post('conversations/:id/messages') sendMessage(...) {}  // 触发 Agent，返回 SSE 流
  @Sse('stream/:clientId') stream(@Param('clientId') id) { return this.sse.createStream(id); }
  @Post('confirm') confirmTool(@Body() dto: ConfirmToolDto) {}  // 用户确认 Tool Call
  @Get('conversations/:id/messages') getHistory(...) {}
}
```

- [ ] **Step 2: 实现 sendMessage 方法**

将 AgentService 的流式输出通过 SSEService 推送给前端。

- [ ] **Step 3: 实现 confirmTool 方法**

接收前端确认，调用 ConfirmationManager.resolve()。

- [ ] **Step 4: 创建 ChatModule 注册所有依赖**

- [ ] **Step 5: 更新 app.module.ts 引入 ChatModule + AgentModule + PermissionModule + ConnectorModule + SchemaModule**

- [ ] **Step 6: 提交**

```bash
git add -A && git commit -m "feat: add ChatController with SSE streaming and tool confirmation"
```

---

## Chunk 8: 前端基础

### Task 38: 前端布局（侧边栏 + 主内容区）

- [ ] **Step 1: 安装 shadcn 组件**

```bash
cd apps/web && pnpm dlx shadcn@latest add button avatar dropdown-menu separator scroll-area
```

- [ ] **Step 2: 创建布局组件**

```typescript
// apps/web/src/components/layout/sidebar.tsx
// 侧边栏: 对话列表 / SaaS 管理 / 工作空间 / 设置
```

```typescript
// apps/web/src/app/(main)/layout.tsx
// 主布局: 左侧 sidebar + 右侧 children
```

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "feat: add frontend layout with sidebar"
```

### Task 39: API Client 工具

- [ ] **Step 1: 创建 apps/web/src/lib/api.ts**

```typescript
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options?.headers },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
```

- [ ] **Step 2: 提交**

```bash
git add -A && git commit -m "feat: add API client utility"
```

### Task 40: SSE Hook

- [ ] **Step 1: 创建 apps/web/src/hooks/use-sse.ts**

```typescript
export function useSSE(clientId: string) {
  const [events, setEvents] = useState<any[]>([]);
  useEffect(() => {
    const source = new EventSource(`${BASE_URL}/chat/stream/${clientId}`);
    source.onmessage = (e) => setEvents((prev) => [...prev, JSON.parse(e.data)]);
    return () => source.close();
  }, [clientId]);
  return events;
}
```

- [ ] **Step 2: 提交**

```bash
git add -A && git commit -m "feat: add useSSE hook for streaming"
```

### Task 41: 认证页面（登录/注册）

- [ ] **Step 1: 配置 NextAuth.js**

```typescript
// apps/web/src/lib/auth.ts
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const res = await fetch(`${SERVER_URL}/auth/login`, {
          method: 'POST', body: JSON.stringify(credentials), headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (data.accessToken) return { id: data.user.id, email: data.user.email, name: data.user.name, token: data.accessToken };
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) { if (user) { token.accessToken = (user as any).token; } return token; },
    async session({ session, token }) { session.accessToken = token.accessToken; return session; },
  },
});
```

- [ ] **Step 2: 创建登录/注册页面**

```typescript
// apps/web/src/app/(auth)/login/page.tsx
// 登录表单: email + password + 登录按钮 + 跳转注册
```

```typescript
// apps/web/src/app/(auth)/register/page.tsx
// 注册表单: email + password + name + 注册按钮 + 跳转登录
```

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "feat: add login/register pages with NextAuth"
```

---

## Chunk 9: 前端聊天

### Task 42: 聊天 UI 组件

- [ ] **Step 1: 安装 shadcn 组件**

```bash
cd apps/web && pnpm dlx shadcn@latest add card input textarea
```

- [ ] **Step 2: 创建 MessageBubble 组件**

```typescript
// apps/web/src/components/chat/message-bubble.tsx
// 用户消息右对齐蓝色，Agent 消息左对齐灰色
```

- [ ] **Step 3: 创建 ToolConfirmationCard 组件**

```typescript
// apps/web/src/components/chat/tool-confirmation-card.tsx
// 显示操作名、参数列表、风险等级（delete 红色高亮）、确认/取消按钮
```

- [ ] **Step 4: 创建 ChatInput 组件**

```typescript
// apps/web/src/components/chat/chat-input.tsx
// 底部输入框 + SaaS 选择器 + 发送按钮
```

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: add chat UI components"
```

### Task 43: 聊天页面集成

- [ ] **Step 1: 创建 apps/web/src/app/(main)/chat/page.tsx**

集成 MessageBubble、ToolConfirmationCard、ChatInput、useSSE hook。

- [ ] **Step 2: 创建 apps/web/src/app/(main)/chat/[id]/page.tsx**

加载指定对话历史 + 继续对话。

- [ ] **Step 3: 集成测试** — 在浏览器中发送消息，观察 Agent 回复。

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat: add chat page with full Agent interaction"
```

---

## Chunk 10: 前端 SaaS 管理 & 设置

### Task 44: SaaS 管理页

- [ ] **Step 1: 创建 SaaS 卡片组件**

```typescript
// apps/web/src/components/sas/saas-card.tsx
// 展示连接器名称、状态、认证方式、管理/断开按钮
```

- [ ] **Step 2: 创建 SaaS 管理页面**

```typescript
// apps/web/src/app/(main)/saas/page.tsx
// 已连接 SaaS 列表 + 添加按钮（预置 / 上传 OpenAPI）
```

- [ ] **Step 3: 创建添加 SaaS 对话框**

选择预置连接器 或 上传 OpenAPI 文档。

- [ ] **Step 4: 创建绑定 SaaS 账号对话框**

输入 API Key 或跳转 OAuth2 授权。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: add SaaS management page"
```

### Task 45: LLM 配置页（首次引导 + 设置）

- [ ] **Step 1: 创建 LLM 配置组件**

```typescript
// apps/web/src/components/settings/llm-config-form.tsx
// 选择供应商 → 输入 API Key → 选择模型 → 测试连接 → 保存
```

- [ ] **Step 2: 创建设置页面**

```typescript
// apps/web/src/app/(main)/settings/page.tsx
// LLM 配置 + 个人偏好
```

- [ ] **Step 3: 创建首次引导页**

```typescript
// apps/web/src/app/(main)/onboarding/page.tsx
// 全屏引导配置 LLM，配置完成后跳转聊天页
```

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat: add LLM config and onboarding pages"
```

### Task 46: 工作空间设置页

- [ ] **Step 1: 创建工作空间页面**

```typescript
// apps/web/src/app/(main)/workspace/page.tsx
// 成员列表 + 邀请成员 + 连接器管理 + 工作空间设置
```

- [ ] **Step 2: 提交**

```bash
git add -A && git commit -m "feat: add workspace settings page"
```

---

## Chunk 11: 端到端集成测试

### Task 47: 后端 E2E 测试

- [ ] **Step 1: 编写完整对话流程 E2E 测试**

```typescript
// apps/server/test/chat-flow.e2e-spec.ts
describe('Chat flow (e2e)', () => {
  it('should register, bind SaaS, send message, confirm tool, get result', async () => {
    // 1. POST /auth/register
    // 2. POST /saas-bindings (bind demo connector)
    // 3. POST /chat/conversations
    // 4. POST /chat/conversations/:id/messages
    // 5. 收到 SSE tool_confirmation_required
    // 6. POST /chat/confirm
    // 7. 收到 SSE 最终回复
  });
});
```

- [ ] **Step 2: 运行 E2E 测试**

```bash
cd apps/server && pnpm test:e2e
```

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "test: add end-to-end chat flow test"
```

### Task 48: 前端 E2E 测试（Playwright）

- [ ] **Step 1: 安装 Playwright**

```bash
cd apps/web && pnpm add -D @playwright/test && pnpm exec playwright install
```

- [ ] **Step 2: 编写核心流程测试**

```typescript
// apps/web/e2e/chat.spec.ts
test('user can register, configure LLM, and chat', async ({ page }) => {
  await page.goto('/register');
  await page.fill('[name="email"]', 'e2e@test.com');
  await page.fill('[name="password"]', '123456');
  await page.fill('[name="name"]', 'E2E');
  await page.click('button[type="submit"]');
  // ... 配置 LLM → 进入聊天 → 发送消息 → 确认 Tool Call
});
```

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "test: add Playwright E2E tests"
```

---

## Chunk 12: Spec 补充功能（评审修复）

> 以下任务覆盖 Spec 中要求但在初始计划中遗漏的功能。

### Task 49: Docker Compose 本地开发环境

- [ ] **Step 1: 创建 docker-compose.yml**

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    ports: ['5432:5432']
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: sasa
    volumes: ['pgdata:/var/lib/postgresql/data']

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']

volumes:
  pgdata:
```

- [ ] **Step 2: 启动并验证**

```bash
cd /Users/wangkezhong/claude_proj/sasa && docker compose up -d
```

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "chore: add docker-compose for local PostgreSQL and Redis"
```

### Task 50: 安装 class-validator（DTO 校验依赖）

- [ ] **Step 1: 安装**

```bash
cd /Users/wangkezhong/claude_proj/sasa/apps/server && pnpm add class-validator class-transformer
```

- [ ] **Step 2: 在 main.ts 中启用全局 ValidationPipe**

```typescript
// apps/server/src/main.ts
import { ValidationPipe } from '@nestjs/common';
// 在 bootstrap() 中添加:
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
```

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "chore: add class-validator and enable global ValidationPipe"
```

### Task 51: LLM 配置 CRUD API

- [ ] **Step 1: 创建 LLMConfigController**

```typescript
// apps/server/src/modules/agent/llm-config.controller.ts
@Controller('llm-configs')
@UseGuards(JwtAuthGuard)
export class LLMConfigController {
  constructor(private llmConfigService: LLMConfigService) {}

  @Post()
  async create(@Req() req, @Body() dto: CreateLLMConfigDto) {
    // 加密 API Key 后存入 llm_configs
    return this.llmConfigService.create(req.user.id, dto);
  }

  @Get()
  async getActive(@Req() req) {
    // 返回当前生效的 LLM 配置（脱敏，不返回 API Key）
    return this.llmConfigService.getActiveConfig(req.user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Req() req, @Body() dto: UpdateLLMConfigDto) {
    return this.llmConfigService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    return this.llmConfigService.remove(id, req.user.id);
  }

  @Post('test')
  async testConnection(@Req() req, @Body() dto: TestLLMConfigDto) {
    // 尝试用提供的配置调用 LLM，返回是否成功
    return this.llmConfigService.testConnection(dto);
  }
}
```

- [ ] **Step 2: 创建 DTO**

```typescript
export class CreateLLMConfigDto {
  @IsString() scope: 'user' | 'workspace';
  @IsOptional() @IsString() workspaceId?: string;
  @IsString() providerId: LLMProvider;
  @IsString() modelId: string;
  @IsString() apiKey: string;
  @IsOptional() @IsString() baseUrl?: string;
}
```

- [ ] **Step 3: 实现 LLMConfigService.create/update/remove/testConnection**

- [ ] **Step 4: 测试，提交**

```bash
git add -A && git commit -m "feat: add LLM config CRUD API with test-connection"
```

### Task 52: System Config API（配置层级管理）

- [ ] **Step 1: 创建 SystemConfigController**

```typescript
@Controller('configs')
@UseGuards(JwtAuthGuard)
export class SystemConfigController {
  @Get(':key') get(@Param('key') key: string, @Req() req) { /* 按层级查找: user → workspace → 平台默认 */ }
  @Put(':key') set(@Param('key') key: string, @Body() dto: SetConfigDto, @Req() req) { /* 写入对应 scope */ }
}
```

- [ ] **Step 2: 实现 SystemConfigService**

```typescript
async resolve(key: string, userId: string, workspaceId?: string): Promise<unknown> {
  // 查找顺序: user scope → workspace scope → 返回代码中的平台默认值
  const userConfig = await this.db.select().from(systemConfigs)
    .where(and(eq(systemConfigs.scope, 'user'), eq(systemConfigs.scopeId, userId), eq(systemConfigs.key, key)));
  if (userConfig.length) return userConfig[0].value;
  if (workspaceId) {
    const wsConfig = await this.db.select().from(systemConfigs)
      .where(and(eq(systemConfigs.scope, 'workspace'), eq(systemConfigs.scopeId, workspaceId), eq(systemConfigs.key, key)));
    if (wsConfig.length) return wsConfig[0].value;
  }
  return DEFAULTS[key]; // 代码内置的默认值
}
```

- [ ] **Step 3: 测试，提交**

```bash
git add -A && git commit -m "feat: add SystemConfig API with hierarchical resolution"
```

### Task 53: 速率限制（Redis 滑动窗口）

- [ ] **Step 1: 安装依赖**

```bash
cd /Users/wangkezhong/claude_proj/sasa/apps/server && pnpm add @nestjs/throttler throttler
```

- [ ] **Step 2: 创建自定义 ThrottlerGuard（基于 Redis 滑动窗口）**

```typescript
// apps/server/src/common/guards/rate-limit.guard.ts
import { ThrottlerGuard } from '@nestjs/throttler';
import { Inject } from '@nestjs/common';
import { REDIS } from '../redis/redis.module';

export class RedisRateLimitGuard extends ThrottlerGuard {
  constructor(@Inject(REDIS) private redis: Redis) {
    super(/* ... */);
  }
  // 使用 Redis 的 INCR + EXPIRE 实现滑动窗口
  // 用户级: rate-limit:user:{userId} — 20/min
  // 工作空间级: rate-limit:workspace:{workspaceId} — 100/min
}
```

- [ ] **Step 3: 在 ChatController 上应用速率限制**

```typescript
@Throttle({ default: { limit: 20, ttl: 60000 } })
```

- [ ] **Step 4: 测试，提交**

```bash
git add -A && git commit -m "feat: add Redis-based rate limiting"
```

### Task 54: Audit Logs RLS 策略 + 定时清理

- [ ] **Step 1: 创建 SQL 迁移，为 audit_logs 添加 RLS**

```sql
-- drizzle/migrations/add_audit_rls.sql
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY audit_logs_select ON audit_logs FOR SELECT USING (true);
-- 禁止 UPDATE 和 DELETE（通过 RLS 而非应用层）
CREATE POLICY audit_logs_no_update ON audit_logs FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY audit_logs_no_delete ON audit_logs FOR DELETE USING (false);
```

- [ ] **Step 2: 实现定时清理任务（NestJS Schedule）**

```typescript
// apps/server/src/modules/permission/audit-cleanup.task.ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class AuditCleanupTask {
  constructor(@Inject(DB) private db: any) {}

  @Cron('0 3 * * *') // 每天凌晨 3 点
  async cleanup() {
    const retentionDays = AUDIT_LOG_RETENTION_DAYS; // 90 天
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    await this.db.delete(auditLogs).where(lt(auditLogs.createdAt, cutoff));
  }
}
```

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "feat: add audit_logs RLS policy and scheduled cleanup"
```

### Task 55: Redis 降级处理

- [ ] **Step 1: 在 PermissionService 中添加 Redis 降级**

```typescript
// 修改 getPermissions 方法，包裹 Redis 调用在 try/catch 中
async getPermissions(userId: string, connectorId: string): Promise<string[]> {
  try {
    const cacheKey = `permissions:${userId}:${connectorId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    console.warn('Redis unavailable, falling back to database for permissions');
  }
  // 降级：直接查数据库
  const [binding] = await this.db.select().from(saasBindings)
    .where(and(eq(saasBindings.userId, userId), eq(saasBindings.connectorId, connectorId)));
  return binding?.permissionsJson as string[] || [];
}
```

- [ ] **Step 2: 提交**

```bash
git add -A && git commit -m "feat: add Redis degradation fallback for permissions"
```

### Task 56: SSE 重连（指数退避 + 消息恢复）

- [ ] **Step 1: 重写 useSSE hook 支持重连**

```typescript
// apps/web/src/hooks/use-sse.ts
import { useState, useEffect, useRef, useCallback } from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function useSSE(clientId: string) {
  const [events, setEvents] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);
  const retryCount = useRef(0);
  const lastMessageId = useRef<string | null>(null);

  const connect = useCallback(() => {
    const source = new EventSource(`${BASE_URL}/chat/stream/${clientId}`);
    source.onopen = () => { setConnected(true); retryCount.current = 0; };
    source.onmessage = (e) => {
      lastMessageId.current = e.lastEventId;
      setEvents((prev) => [...prev, JSON.parse(e.data)]);
    };
    source.onerror = () => {
      setConnected(false);
      source.close();
      const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30000); // 指数退避，最大 30s
      retryCount.current++;
      setTimeout(connect, delay);
    };
    return source;
  }, [clientId]);

  useEffect(() => { const source = connect(); return () => source.close(); }, [connect]);
  return { events, connected };
}
```

- [ ] **Step 2: 提交**

```bash
git add -A && git commit -m "feat: add SSE reconnection with exponential backoff"
```

### Task 57: SSE 端点 JWT 认证

- [ ] **Step 1: 修改 ChatController 的 SSE 端点**

EventSource 不支持自定义 Header，因此使用 query parameter 传递 token：

```typescript
@Sse('stream/:clientId')
stream(@Param('clientId') clientId: string, @Query('token') token: string) {
  // 验证 JWT token
  try {
    const payload = this.jwtService.verify(token);
    return this.sse.createStream(clientId);
  } catch {
    throw new UnauthorizedException('Invalid token');
  }
}
```

- [ ] **Step 2: 更新 useSSE hook 传递 token**

```typescript
const token = localStorage.getItem('token');
const source = new EventSource(`${BASE_URL}/chat/stream/${clientId}?token=${token}`);
```

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "feat: add JWT authentication to SSE endpoint"
```

### Task 58: SaaS API 重试逻辑

- [ ] **Step 1: 在 BaseRestConnector.executeToolCall 中添加重试**

```typescript
// packages/connector-sdk/src/base-connector.ts 修改
async executeToolCall(toolName: string, parameters: Record<string, unknown>, credentials: string): Promise<ToolResult> {
  const toolDef = this.getToolDefinitions().find((t) => t.name === toolName);
  if (!toolDef) return { success: false, error: { code: 'TOOL_NOT_FOUND', message: `Tool ${toolName} not found` } };

  const execute = async (): Promise<ToolResult> => {
    const url = `${this.getBaseUrl()}${this.resolvePath(toolDef.apiMapping.path, parameters)}`;
    const response = await fetch(url, { /* ... */ });
    if (!response.ok) {
      const body = await response.text();
      return { success: false, error: { code: String(response.status), message: body } };
    }
    return { success: true, data: await response.json() };
  };

  try {
    const result = await execute();
    if (!result.success && result.error?.code === 'NETWORK_ERROR') {
      return await execute(); // 网络错误时重试一次
    }
    return result;
  } catch (error) {
    return { success: false, error: { code: 'NETWORK_ERROR', message: (error as Error).message } };
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add -A && git commit -m "feat: add retry-once logic for SaaS API network errors"
```

### Task 59: LLM API Key 失效处理

- [ ] **Step 1: 在 AgentService 中捕获 LLM 认证错误**

```typescript
// agent.service.ts 中 processMessage 方法的 streamText 调用包裹 try/catch
try {
  const result = await streamText({ ... });
  // 处理结果
} catch (error) {
  if (error?.statusCode === 401 || error?.statusCode === 403) {
    // LLM API Key 失效，推送错误事件到前端
    this.sseService.push(clientId, {
      event: 'llm_auth_error',
      data: JSON.stringify({ message: '模型 API Key 已失效，请检查配置' }),
    });
    return;
  }
  throw error;
}
```

- [ ] **Step 2: 前端处理 llm_auth_error 事件**

在 useSSE hook 或 ChatPage 中监听 `llm_auth_error` 事件，弹出提示并提供跳转设置页按钮。

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "feat: add LLM API Key failure handling with user notification"
```

### Task 60: Tool Definition 阈值过滤

- [ ] **Step 1: 在 ToolRegistry 中添加阈值过滤方法**

```typescript
// tool-registry.service.ts 追加
filterToolsByThreshold(tools: ToolDefRow[], threshold: number = TOOL_DEFINITION_THRESHOLD): ToolDefRow[] {
  if (tools.length <= threshold) return tools;
  // 简单策略：按 riskLevel 优先级排序（write > read > delete），截取前 threshold 个
  // 后续迭代可根据对话上下文更智能地筛选
  return tools.slice(0, threshold);
}
```

- [ ] **Step 2: 在 AgentService.processMessage 中调用**

```typescript
const filteredTools = this.permissionService.filterTools(allTools, permissions);
const thresholdFiltered = this.toolRegistry.filterToolsByThreshold(filteredTools);
const aiTools = this.toolRegistry.toAITools(thresholdFiltered);
```

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "feat: add tool definition threshold filtering"
```

### Task 61: 删除 Task 18 中多余的 Step 4（passwordHash 已在 Task 6 中）

- [ ] **Step 1: 删除 Task 18 中的 Step 4**

Task 18 的 Step 4（"需要先给 users 表加 passwordHash 字段"）已不需要，因为 Task 6 中 users 表定义已包含 passwordHash。直接移除该步骤。

- [ ] **Step 2: 提交**

```bash
git add -A && git commit -m "docs: remove redundant passwordHash migration step from Task 18"
```

### Task 62: OAuth Token 刷新流程

- [ ] **Step 1: 在 SaaSBindingService 中添加 token 刷新方法**

```typescript
async refreshOAuthToken(userId: string, bindingId: string): Promise<void> {
  const [binding] = await this.db.select().from(saasBindings)
    .where(and(eq(saasBindings.id, bindingId), eq(saasBindings.userId, userId)));
  if (!binding || binding.authType !== 'oauth2') return;

  const decrypted = JSON.parse(this.crypto.decrypt(binding.encryptedCred));
  // 使用 refresh_token 向 SaaS OAuth 端点刷新
  const response = await fetch(`${connectorOAuthUrl}/token`, {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: decrypted.refreshToken }),
  });
  if (!response.ok) {
    // 刷新失败，标记 binding 为 expired，引导用户重新授权
    await this.db.update(saasBindings).set({ status: 'expired' }).where(eq(saasBindings.id, bindingId));
    throw new UnauthorizedException('OAuth token refresh failed, please re-authorize');
  }
  const tokens = await response.json();
  const newEncrypted = this.crypto.encrypt(JSON.stringify({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token }));
  await this.db.update(saasBindings).set({ encryptedCred: newEncrypted, expiresAt: new Date(Date.now() + tokens.expires_in * 1000) })
    .where(eq(saasBindings.id, bindingId));
}
```

- [ ] **Step 2: 在 Connector 执行前自动检查并刷新过期 token**

在 AgentService 或 Connector Module 中，执行 Tool Call 前检查 binding 的 expiresAt，如已过期则自动调用 refreshOAuthToken。

- [ ] **Step 3: 测试，提交**

```bash
git add -A && git commit -m "feat: add OAuth token refresh with auto-check before execution"
```
