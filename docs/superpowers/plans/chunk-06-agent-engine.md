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


---

### Chunk 6 验证流程

#### 步骤 A：补充单测（覆盖率 ≥ 90%）

- [ ] **为 LLMConfigService 补充边界测试**

```typescript
it('should throw when no config found', async () => { /* ... */ });
it('should fall back to workspace config', async () => { /* ... */ });
it('should decrypt API key before returning', async () => { /* ... */ });
```

- [ ] **为 PromptBuilderService 补充测试**

```typescript
it('should include all required sections', () => { /* ... */ });
it('should omit custom instructions when not provided', () => { /* ... */ });
it('should handle empty user name', () => { /* ... */ });
```

- [ ] **为 ContextManagerService 补充测试**

```typescript
it('should keep messages within context window budget', () => { /* ... */ });
it('should handle empty message list', () => { /* ... */ });
it('should handle single message', () => { /* ... */ });
```

- [ ] **为 ConfirmationManager 补充测试**

```typescript
it('should ignore resolve for unknown id', () => { /* ... */ });
it('should handle multiple sequential confirmations', async () => { /* ... */ });
it('should handle modify action with new parameters', async () => { /* ... */ });
```

- [ ] **为 ToolRegistry 补充测试**

```typescript
it('should handle empty tool list', () => { /* ... */ });
it('should filter tools by threshold', () => { /* ... */ });
it('should convert complex parameter schemas', () => { /* ... */ });
```

- [ ] **运行覆盖率检查**

```bash
cd /Users/wangkezhong/claude_proj/sasa/apps/server && pnpm test -- --coverage
```

#### 步骤 B：集成测试

- [ ] **Agent 完整推理流程（mock LLM）**

```typescript
// test/agent.integration.spec.ts
describe('Agent integration', () => {
  it('should process message → tool call → confirmation → result', async () => {
    // Mock streamText 返回一个 tool_call
    // Mock ConfirmationManager 立即 resolve
    // 验证整个流程: LLM 调用 → 工具过滤 → 确认等待 → 执行 → 审计日志
  });

  it('should handle LLM returning text only (no tool call)', async () => {
    // Mock streamText 返回纯文本
    // 验证直接返回，无工具调用
  });

  it('should respect max 5 tool call steps', async () => {
    // Mock streamText 持续返回 tool_call
    // 验证第 5 步后强制中断并附加提示
  });
});
```

#### 步骤 C：端到端测试（Playwright）

- [ ] **对话 + Tool Call 确认 E2E**

```typescript
// apps/web/e2e/agent-chat.spec.ts
test('user sends message and confirms tool call', async ({ page }) => {
  // 前置: 已登录 + 已配置 LLM + 已绑定 demo connector
  await page.goto('/chat');
  await page.fill('[placeholder="输入消息..."]', '帮我提交一个年假申请，下周一到周三');
  await page.click('button:text("发送")');

  // 等待确认卡片出现
  await expect(page.locator('text=确认执行')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('text=提交请假申请')).toBeVisible();

  // 点击确认
  await page.click('button:text("确认执行")');

  // 等待 Agent 回复结果
  await expect(page.locator('text=已提交')).toBeVisible({ timeout: 30000 });
});
```

#### 步骤 D：Code Review

```
检查清单:
□ LLMConfigService: API Key 解密后不泄露到日志
□ AgentService: streamText 错误处理（401/403 → llm_auth_error）
□ ConfirmationManager: 内存 Map 不会泄漏（超时后自动清理）
□ ToolRegistry: 大量工具时性能可接受
□ ContextManager: 裁剪策略不丢失关键上下文
□ maxSteps=5 边界: 第 5 步后的中止逻辑正确
□ System prompt 不包含用户敏感信息
```

#### 步骤 E：Git 提交

```bash
cd /Users/wangkezhong/claude_proj/sasa
git add -A
git commit -m "feat(chunk-6): agent engine with LLM orchestration, tool calling, confirmation

- LLMConfigService: user/workspace config resolution
- PromptBuilderService: dynamic system prompt construction
- ContextManagerService: message trimming with round budget
- ConfirmationManager: in-memory pending with timeout
- ToolRegistry: DB loading + AI SDK conversion + threshold filtering
- AgentService: multi-step tool calling with confirmation flow
- Unit tests: 90%+ coverage
- Integration tests: full agent reasoning loop
- E2E tests: chat with tool call confirmation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
