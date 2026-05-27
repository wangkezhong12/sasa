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


---

### Chunk 11 验证流程

> Chunk 11 本身即为端到端测试 Chunk，验证步骤整合在任务中。

#### 步骤 A：补充单测

- [ ] **N/A — Chunk 11 为测试 Chunk，无新增业务代码**

#### 步骤 B：集成测试

- [ ] **N/A — Chunk 11 的内容即为集成/端到端测试**

#### 步骤 C：端到端测试

- [ ] **执行所有 Playwright 测试套件**

```bash
cd /Users/wangkezhong/claude_proj/sasa/apps/web
pnpm exec playwright test
```

Expected: 所有测试通过

#### 步骤 D：Code Review

```
检查清单:
□ E2E 测试不依赖硬编码数据（使用动态生成的测试数据）
□ E2E 测试有清理逻辑（测试后删除创建的数据）
□ Playwright config: baseURL 正确
□ 测试超时设置合理（LLM 调用可能较慢）
□ CI 集成配置（如适用）
```

#### 步骤 E：Git 提交

```bash
cd /Users/wangkezhong/claude_proj/sasa
git add -A
git commit -m "feat(chunk-11): end-to-end test suite

- Backend E2E: full chat flow with tool confirmation
- Frontend E2E: Playwright tests for auth, chat, SaaS, settings
- All E2E tests passing

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
