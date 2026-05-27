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


---

### Chunk 9 验证流程

#### 步骤 A：补充单测（覆盖率 ≥ 90%）

- [ ] **为 MessageBubble 添加渲染测试**

```typescript
// apps/web/src/components/chat/message-bubble.spec.tsx
describe('MessageBubble', () => {
  it('should render user message with blue background right-aligned', () => { /* ... */ });
  it('should render assistant message with gray background left-aligned', () => { /* ... */ });
  it('should render markdown content', () => { /* ... */ });
});
```

- [ ] **为 ToolConfirmationCard 添加测试**

```typescript
// apps/web/src/components/chat/tool-confirmation-card.spec.tsx
describe('ToolConfirmationCard', () => {
  it('should render tool name and parameters', () => { /* ... */ });
  it('should highlight delete risk level in red', () => { /* ... */ });
  it('should call onConfirm when confirm button clicked', () => { /* ... */ });
  it('should call onCancel when cancel button clicked', () => { /* ... */ });
  it('should call onModify when modify and submit', () => { /* ... */ });
});
```

- [ ] **为 ChatInput 添加测试**

```typescript
// apps/web/src/components/chat/chat-input.spec.tsx
describe('ChatInput', () => {
  it('should call onSend with message text', () => { /* ... */ });
  it('should clear input after send', () => { /* ... */ });
  it('should not send empty message', () => { /* ... */ });
  it('should allow selecting SaaS from dropdown', () => { /* ... */ });
});
```

- [ ] **运行覆盖率检查**

```bash
cd /Users/wangkezhong/claude_proj/sasa/apps/web && pnpm test -- --coverage
```

#### 步骤 B：集成测试

- [ ] **Chat 页面组件集成**

```typescript
// apps/web/src/app/(main)/chat/page.spec.tsx
describe('Chat page', () => {
  it('should render message list + input + send messages', async () => { /* ... */ });
  it('should show tool confirmation card when SSE event received', async () => { /* ... */ });
  it('should append assistant response to message list', async () => { /* ... */ });
});
```

#### 步骤 C：端到端测试（Playwright）

- [ ] **完整聊天交互 E2E**

```typescript
// apps/web/e2e/chat-interaction.spec.ts
test('chat shows streaming response word by word', async ({ page }) => {
  await page.goto('/chat');
  await page.fill('[placeholder="输入消息..."]', '你好，请介绍一下你自己');
  await page.click('button:text("发送")');
  // 验证 Agent 回复逐步出现（流式）
  const assistantMsg = page.locator('[data-role="assistant"]').last();
  await expect(assistantMsg).not.toBeEmpty({ timeout: 30000 });
});

test('tool confirmation card appears and can be confirmed', async ({ page }) => {
  await page.goto('/chat');
  await page.fill('[placeholder="输入消息..."]', '帮我查询假期余额');
  await page.click('button:text("发送")');
  await expect(page.locator('[data-testid="tool-confirmation"]')).toBeVisible({ timeout: 30000 });
  await page.click('button:text("确认执行")');
  await expect(page.locator('text=已查询')).toBeVisible({ timeout: 30000 });
});

test('tool confirmation can be cancelled', async ({ page }) => {
  await page.goto('/chat');
  await page.fill('[placeholder="输入消息..."]', '帮我提交请假');
  await page.click('button:text("发送")');
  await expect(page.locator('[data-testid="tool-confirmation"]')).toBeVisible({ timeout: 30000 });
  await page.click('button:text("取消")');
  await expect(page.locator('text=已取消')).toBeVisible({ timeout: 15000 });
});
```

#### 步骤 D：Code Review

```
检查清单:
□ MessageBubble: XSS 防护（React 默认转义，注意 dangerouslySetInnerHTML）
□ ToolConfirmationCard: delete 级别操作红色醒目标注
□ ChatInput: 发送后清空、disabled 状态（Agent 回复中）
□ SSE 事件处理: 异常事件不崩溃（未知 event type 忽略）
□ 消息列表: 自动滚动到底部
□ 移动端: 输入框不被键盘遮挡
```

#### 步骤 E：Git 提交

```bash
cd /Users/wangkezhong/claude_proj/sasa
git add -A
git commit -m "feat(chunk-9): chat UI with message bubbles, tool confirmation cards

- MessageBubble: user/assistant styled message display
- ToolConfirmationCard: operation details, risk highlighting, confirm/cancel
- ChatInput: message input with SaaS selector
- Chat page: SSE integration with streaming display
- Unit tests: 90%+ coverage on chat components
- E2E tests: streaming, confirmation, cancellation flows

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
