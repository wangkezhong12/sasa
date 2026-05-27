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


---

### Chunk 7 验证流程

#### 步骤 A：补充单测（覆盖率 ≥ 90%）

- [ ] **为 ConversationService 补充测试**

```typescript
describe('ConversationService', () => {
  it('should create conversation with optional workspace/connector', async () => { /* ... */ });
  it('should list conversations ordered by updatedAt desc', async () => { /* ... */ });
  it('should return null for non-existent conversation', async () => { /* ... */ });
  it('should update title', async () => { /* ... */ });
});
```

- [ ] **为 SSEService 补充测试**

```typescript
describe('SSEService', () => {
  it('should clean up client on disconnect', (done) => { /* ... */ });
  it('should handle push to disconnected client gracefully', () => { /* ... */ });
  it('should support multiple concurrent clients', () => { /* ... */ });
});
```

- [ ] **运行覆盖率检查**

```bash
cd /Users/wangkezhong/claude_proj/sasa/apps/server && pnpm test -- --coverage
```

#### 步骤 B：集成测试

- [ ] **Chat API 完整流程**

```typescript
// test/chat.integration.spec.ts
describe('Chat API (integration)', () => {
  it('should create conversation, send message, receive SSE events', async () => {
    // 1. POST /chat/conversations → 创建对话
    // 2. 连接 SSE /chat/stream/:clientId
    // 3. POST /chat/conversations/:id/messages → 发送消息
    // 4. 验证 SSE 收到事件流
  });

  it('should handle tool confirmation via POST /chat/confirm', async () => {
    // 1. 发送触发 tool call 的消息
    // 2. 收到 tool_confirmation_required 事件
    // 3. POST /chat/confirm with action: 'confirm'
    // 4. 收到最终结果事件
  });

  it('should load conversation history', async () => {
    // GET /chat/conversations/:id/messages → 返回历史消息
  });
});
```

#### 步骤 C：端到端测试（Playwright）

- [ ] **完整对话 E2E（含 SSE 流式）**

```typescript
// apps/web/e2e/chat-flow.spec.ts
test('full chat flow with SSE streaming', async ({ page }) => {
  await page.goto('/chat');
  // 创建新对话
  await page.click('text=新对话');
  // 发送消息
  await page.fill('[placeholder="输入消息..."]', '你好');
  await page.click('button:text("发送")');
  // 验证 Agent 回复以流式方式出现（文字逐步显示）
  const responseText = page.locator('[data-role="assistant"]').last();
  await expect(responseText).toBeVisible({ timeout: 30000 });
});

test('chat history persists after page reload', async ({ page }) => {
  // 发送消息后刷新页面，验证历史消息还在
  await page.goto('/chat');
  await page.fill('[placeholder="输入消息..."]', '测试持久化');
  await page.click('button:text("发送")');
  await page.reload();
  await expect(page.locator('text=测试持久化')).toBeVisible();
});
```

#### 步骤 D：Code Review

```
检查清单:
□ SSE 端点有 JWT 认证（query param token）
□ ChatController: 所有端点有 JwtAuthGuard
□ SSE 连接泄漏: finalize 中清理 Map
□ 消息持久化: user 和 assistant 消息都入库
□ conversation.connectorId 可为 null（支持切换 SaaS）
□ ConfirmToolDto: action 枚举校验 (confirm/cancel/modify)
□ SSE 推送数据不包含敏感信息（加密凭证等）
```

#### 步骤 E：Git 提交

```bash
cd /Users/wangkezhong/claude_proj/sasa
git add -A
git commit -m "feat(chunk-7): chat gateway with SSE streaming, tool confirmation, history

- ConversationService: CRUD with workspace/connector association
- SSEService: Subject-based streaming with client management
- ChatController: conversations, messages, SSE stream, confirm
- JWT auth on SSE endpoint via query parameter
- Unit tests: 90%+ coverage
- Integration tests: full chat API flow
- E2E tests: streaming chat with history persistence

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
