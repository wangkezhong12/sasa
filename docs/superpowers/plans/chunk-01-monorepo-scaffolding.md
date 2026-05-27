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


---

### Chunk 1 验证流程

#### 步骤 A：补充单测（覆盖率 ≥ 90%）

- [ ] **为 shared 包添加类型校验单测**

```typescript
// packages/shared/src/types/connector.spec.ts
import { describe, it, expect } from 'vitest';
import type { SaaSConnector, ConnectorToolDefinition, ToolResult } from './connector';

describe('connector types', () => {
  it('SaaSConnector interface should define required methods', () => {
    const connector: SaaSConnector = {
      name: 'test', version: '1.0', protocol: 'rest',
      supportedAuthTypes: ['api_key'],
      validateCredentials: async () => true,
      getToolDefinitions: () => [],
      fetchPermissions: async () => [],
      executeToolCall: async () => ({ success: true }),
    };
    expect(connector.name).toBe('test');
    expect(connector.protocol).toBe('rest');
  });
});
```

- [ ] **为 connector-sdk 添加 BaseRestConnector 单测**

```typescript
// packages/connector-sdk/src/base-connector.spec.ts
import { describe, it, expect } from 'vitest';
// 测试路径解析、header 构建、body 映射等私有方法通过子类间接测试
```

- [ ] **运行所有单测并检查覆盖率**

```bash
cd /Users/wangkezhong/claude_proj/sasa
cd packages/shared && pnpm test -- --coverage
cd ../connector-sdk && pnpm test -- --coverage
```

Expected: 覆盖率 ≥ 90%

#### 步骤 B：集成测试

- [ ] **验证 monorepo 构建和包间引用**

```bash
cd /Users/wangkezhong/claude_proj/sasa
pnpm build
# 验证 server 能引用 shared 类型
cd apps/server && node -e "require('@sasa/shared').LLM_PROVIDERS" || echo "FAIL"
# 验证 server 能启动
pnpm dev &
sleep 3 && curl -s http://localhost:4000 && kill %1
```

Expected: 构建成功，包引用正确，服务器启动

#### 步骤 C：端到端测试（Playwright）

> Chunk 1 为脚手架阶段，无用户界面可测试。跳过 Playwright。

- [ ] **标记为 N/A — Chunk 1 无用户界面**

#### 步骤 D：Code Review

- [ ] **审查以下风险点**

```
检查清单:
□ package.json 中所有依赖版本是否固定（^minor 可接受）
□ tsconfig.json 的 module/moduleResolution 是否跨包兼容（shared 输出 CommonJS）
□ .env.example 是否包含所有必需的环境变量且不含真实密钥
□ .gitignore 是否覆盖 node_modules/dist/.env/.turbo/.next
□ turbo.json 的 task 依赖配置是否正确（shared 先于 server 构建）
□ workspace 引用是否使用 workspace:* 协议
```

#### 步骤 E：Git 提交

```bash
cd /Users/wangkezhong/claude_proj/sasa
git add -A
git commit -m "feat(chunk-1): monorepo scaffolding with shared types, connector-sdk, NestJS, Next.js

- Turborepo + pnpm workspace monorepo
- @sasa/shared: types (connector, message, user, llm) + constants
- @sasa/connector-sdk: BaseRestConnector with REST execution
- @sasa/server: NestJS 11 scaffold
- @sasa/web: Next.js 15 + shadcn/ui + Tailwind

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
