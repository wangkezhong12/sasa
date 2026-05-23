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

