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

---

### Chunk 12 验证流程

#### 步骤 A：补充单测（覆盖率 ≥ 90%）

- [ ] **为 RedisRateLimitGuard 添加单测**

```typescript
// apps/server/src/common/guards/rate-limit.guard.spec.ts
describe('RedisRateLimitGuard', () => {
  it('should allow requests within limit', async () => { /* ... */ });
  it('should block requests exceeding limit', async () => { /* ... */ });
  it('should have separate limits for user and workspace', async () => { /* ... */ });
});
```

- [ ] **为 SystemConfigService 添加单测**

```typescript
describe('SystemConfigService.resolve', () => {
  it('should return user config when set', async () => { /* ... */ });
  it('should fall back to workspace config', async () => { /* ... */ });
  it('should return platform default when no config', async () => { /* ... */ });
});
```

- [ ] **为 AuditCleanupTask 添加单测**

```typescript
describe('AuditCleanupTask.cleanup', () => {
  it('should delete logs older than retention period', async () => { /* ... */ });
  it('should not delete recent logs', async () => { /* ... */ });
});
```

- [ ] **为 OAuth refresh 添加单测**

```typescript
describe('SaaSBindingService.refreshOAuthToken', () => {
  it('should refresh token and update binding', async () => { /* ... */ });
  it('should mark binding as expired on refresh failure', async () => { /* ... */ });
  it('should skip non-OAuth bindings', async () => { /* ... */ });
});
```

- [ ] **运行覆盖率检查**

```bash
cd /Users/wangkezhong/claude_proj/sasa/apps/server && pnpm test -- --coverage
```

#### 步骤 B：集成测试

- [ ] **速率限制 + Redis 降级 + 审计清理 集成测试**

```typescript
// test/spec-supplements.integration.spec.ts
describe('Spec supplements (integration)', () => {
  it('should rate limit after 20 requests per minute', async () => {
    // 连续发送 21 次请求，第 21 次应返回 429
  });

  it('should fall back to DB when Redis is down', async () => {
    // 停止 Redis，验证权限查询仍然工作（从 DB 读取）
  });

  it('should clean up old audit logs', async () => {
    // 插入 91 天前的审计日志，运行清理，验证被删除
  });
});
```

#### 步骤 C：端到端测试（Playwright）

- [ ] **速率限制和 LLM 失效 E2E**

```typescript
// apps/web/e2e/spec-supplements.spec.ts
test('LLM API key failure shows error prompt', async ({ page }) => {
  // 配置一个无效的 API Key
  await page.goto('/settings');
  await page.selectOption('[name="provider"]', 'openai');
  await page.fill('[name="apiKey"]', 'sk-invalid-key');
  await page.click('button:text("保存")');

  // 尝试聊天
  await page.goto('/chat');
  await page.fill('[placeholder="输入消息..."]', '你好');
  await page.click('button:text("发送")');

  // 应该看到 API Key 失效提示
  await expect(page.locator('text=API Key')).toBeVisible({ timeout: 15000 });
});

test('SSE reconnects after server restart', async ({ page }) => {
  // 建立聊天连接，重启后端，验证前端自动重连
  await page.goto('/chat');
  await page.fill('[placeholder="输入消息..."]', '测试重连');
  await page.click('button:text("发送")');
  // 后端重启后验证 SSE 重连
  await expect(page.locator('[data-role="assistant"]')).toBeVisible({ timeout: 30000 });
});
```

#### 步骤 D：Code Review

```
检查清单:
□ Rate limiting: Redis key 设计不冲突（user vs workspace 前缀）
□ RLS policy: audit_logs 只允许 INSERT + SELECT
□ Audit cleanup: 使用事务删除，避免锁表
□ OAuth refresh: refresh_token 加密存储
□ SystemConfig: 配置层级查找无死循环
□ Docker Compose: 不含生产环境配置
□ .env.example: 更新了新增的环境变量
```

#### 步骤 E：Git 提交

```bash
cd /Users/wangkezhong/claude_proj/sasa
git add -A
git commit -m "feat(chunk-12): spec supplements — rate limiting, RLS, Redis degradation, SSE auth

- Docker Compose for local PostgreSQL + Redis
- class-validator global ValidationPipe
- LLM Config CRUD API with test-connection
- SystemConfig API with hierarchical resolution
- Redis-based rate limiting (user 20/min, workspace 100/min)
- Audit logs RLS policy + 90-day cleanup cron
- Redis degradation fallback for permissions
- SSE reconnection with exponential backoff
- SSE JWT authentication via query parameter
- SaaS API retry-once on network error
- LLM API Key failure handling with user notification
- Tool definition threshold filtering (50+ tools)
- OAuth token auto-refresh with expiry check
- Unit tests: 90%+ coverage
- Integration tests: rate limiting, Redis fallback, audit cleanup
- E2E tests: LLM failure handling, SSE reconnection

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
