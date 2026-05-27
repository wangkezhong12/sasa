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


---

### Chunk 10 验证流程

#### 步骤 A：补充单测（覆盖率 ≥ 90%）

- [ ] **为 SaaS 管理组件添加测试**

```typescript
// apps/web/src/components/saas/saas-card.spec.tsx
describe('SaaSCard', () => {
  it('should display connector name and status', () => { /* ... */ });
  it('should show bound status when connected', () => { /* ... */ });
  it('should call onDisconnect when disconnect clicked', () => { /* ... */ });
});
```

- [ ] **为 LLM Config Form 添加测试**

```typescript
// apps/web/src/components/settings/llm-config-form.spec.tsx
describe('LLMConfigForm', () => {
  it('should render provider selector', () => { /* ... */ });
  it('should show model options when provider selected', () => { /* ... */ });
  it('should validate API key is not empty', () => { /* ... */ });
  it('should call onSubmit with valid form data', () => { /* ... */ });
});
```

- [ ] **运行覆盖率检查**

```bash
cd /Users/wangkezhong/claude_proj/sasa/apps/web && pnpm test -- --coverage
```

#### 步骤 B：集成测试

- [ ] **SaaS 管理 + LLM 配置页面交互**

```typescript
describe('SaaS management page', () => {
  it('should list connected SaaS apps', () => { /* ... */ });
  it('should open add dialog on button click', () => { /* ... */ });
});

describe('Settings page', () => {
  it('should show current LLM config', () => { /* ... */ });
  it('should save new config', () => { /* ... */ });
});
```

#### 步骤 C：端到端测试（Playwright）

- [ ] **SaaS 管理全流程 E2E**

```typescript
// apps/web/e2e/saas-management.spec.ts
test('add demo connector via preset', async ({ page }) => {
  await page.goto('/saas');
  await page.click('text=添加 SaaS');
  await page.click('text=Demo ERP');
  await page.fill('[name="apiKey"]', 'demo-test-key');
  await page.click('button:text("绑定")');
  await expect(page.locator('text=已连接')).toBeVisible();
});

test('disconnect SaaS connector', async ({ page }) => {
  await page.goto('/saas');
  await page.click('button:text("断开")');
  await page.click('button:text("确认")');
  await expect(page.locator('text=已断开')).toBeVisible();
});
```

- [ ] **LLM 配置全流程 E2E**

```typescript
// apps/web/e2e/llm-config.spec.ts
test('first-time LLM configuration', async ({ page }) => {
  // 新用户首次进入应看到引导页
  await page.goto('/');
  await expect(page.locator('text=配置你的 AI 模型')).toBeVisible();
  await page.selectOption('[name="provider"]', 'openai');
  await page.fill('[name="apiKey"]', 'sk-test-key');
  await page.selectOption('[name="model"]', 'gpt-4o');
  await page.click('button:text("保存并开始")');
  await expect(page).toHaveURL(/.*\/chat/);
});
```

#### 步骤 D：Code Review

```
检查清单:
□ SaaS 绑定: API Key 输入框用 type="password"
□ LLM 配置: API Key 不存入 localStorage（仅服务端加密存储）
□ 断开绑定: 有二次确认对话框
□ 工作空间设置: 成员管理有权限检查（仅 owner/admin）
□ 文件上传 (OpenAPI): 限制文件类型和大小
□ 引导页: 未配置 LLM 时禁用聊天输入
```

#### 步骤 E：Git 提交

```bash
cd /Users/wangkezhong/claude_proj/sasa
git add -A
git commit -m "feat(chunk-10): SaaS management, LLM config, workspace settings pages

- SaaS management: list, add (preset/OpenAPI), bind, disconnect
- LLM config: provider selection, API key input, test connection
- Onboarding: first-time LLM setup with redirect
- Workspace settings: members, connectors, space config
- Unit tests: 90%+ coverage
- E2E tests: full SaaS and LLM configuration flows

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
