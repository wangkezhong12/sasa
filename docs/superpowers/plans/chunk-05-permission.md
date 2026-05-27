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


---

### Chunk 5 验证流程

#### 步骤 A：补充单测（覆盖率 ≥ 90%）

- [ ] **为 PermissionService 补充 Redis 降级测试**

```typescript
// permission.service.spec.ts 追加
describe('PermissionService.filterTools', () => {
  it('should include tools without requiredPermission', () => { /* ... */ });
  it('should exclude tools user has no permission for', () => { /* ... */ });
  it('should return empty for empty permission list', () => { /* ... */ });
});

describe('PermissionService.getPermissions', () => {
  it('should return cached permissions from Redis', async () => { /* ... */ });
  it('should fall back to database when Redis fails', async () => { /* ... */ });
  it('should return empty array when no binding exists', async () => { /* ... */ });
});

describe('PermissionService.syncPermissions', () => {
  it('should call connector.fetchPermissions and update DB + cache', async () => { /* ... */ });
  it('should return empty when binding not found', async () => { /* ... */ });
});
```

- [ ] **为 AuditService 补充查询测试**

```typescript
// audit.service.spec.ts 追加
it('should find audit logs by user with limit', async () => { /* ... */ });
it('should log with all optional fields', async () => { /* ... */ });
it('should log with minimal required fields', async () => { /* ... */ });
```

- [ ] **运行覆盖率检查**

```bash
cd /Users/wangkezhong/claude_proj/sasa/apps/server && pnpm test -- --coverage
```

#### 步骤 B：集成测试

- [ ] **权限过滤 + 审计日志全流程**

```typescript
// test/permission.integration.spec.ts
describe('Permission flow (integration)', () => {
  it('should filter tools based on user permissions and log audit', async () => {
    // 1. 创建用户 + 绑定 demo connector（permissions: ['leave:submit', 'leave:view']）
    // 2. 调用 PermissionService.getPermissions → 返回正确权限
    // 3. 调用 PermissionService.filterTools → 过滤掉 leave:approve
    // 4. 调用 AuditService.log → 写入审计日志
    // 5. 调用 AuditService.findByUser → 返回刚才的日志
  });
});
```

#### 步骤 C：端到端测试（Playwright）

- [ ] **权限隔离 E2E 测试**

```typescript
// apps/web/e2e/permission.spec.ts
test('user can only see permitted tools in chat', async ({ page }) => {
  // 前置: 用户绑定了 demo connector
  await page.goto('/chat');
  await page.fill('[placeholder="输入消息..."]', '查询我的假期余额');
  await page.click('button:text("发送")');
  // Agent 应该能成功调用 query_leave_balance
  await expect(page.locator('text=假期余额')).toBeVisible({ timeout: 10000 });
});
```

#### 步骤 D：Code Review

```
检查清单:
□ PermissionService: Redis 缓存 TTL 合理（30 分钟）
□ PermissionService: Redis 故障时优雅降级（try/catch + DB 回退）
□ AuditService: 仅暴露 create + find，无 update/delete 方法
□ filterTools: 空权限列表不意外放行所有工具
□ 审计日志不记录敏感信息（API Key、密码等）
```

#### 步骤 E：Git 提交

```bash
cd /Users/wangkezhong/claude_proj/sasa
git add -A
git commit -m "feat(chunk-5): permission filtering with Redis cache, audit logging

- PermissionService: filter tools by user permissions, Redis cache with 30min TTL
- AuditService: append-only logging, find by user
- Redis degradation: fallback to DB when Redis unavailable
- Unit tests: 90%+ coverage
- Integration tests: permission + audit flow

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
