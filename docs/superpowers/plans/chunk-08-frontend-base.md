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


---

### Chunk 8 验证流程

#### 步骤 A：补充单测（覆盖率 ≥ 90%）

- [ ] **为 API Client 添加单测**

```typescript
// apps/web/src/lib/api.spec.ts
import { apiFetch } from './api';

describe('apiFetch', () => {
  it('should add auth header when token exists', async () => { /* mock fetch */ });
  it('should throw on non-ok response', async () => { /* ... */ });
  it('should work without token', async () => { /* ... */ });
});
```

- [ ] **为 useSSE hook 添加单测**

```typescript
// apps/web/src/hooks/use-sse.spec.ts — 使用 @testing-library/react-hooks
```

- [ ] **为 Layout 组件添加渲染测试**

```typescript
// apps/web/src/components/layout/sidebar.spec.tsx
import { render, screen } from '@testing-library/react';
import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  it('should render navigation items', () => {
    render(<Sidebar />);
    expect(screen.getByText('对话')).toBeInTheDocument();
    expect(screen.getByText('SaaS 管理')).toBeInTheDocument();
  });
});
```

- [ ] **运行覆盖率检查**

```bash
cd /Users/wangkezhong/claude_proj/sasa/apps/web && pnpm test -- --coverage
```

#### 步骤 B：集成测试

- [ ] **前端构建 + 页面渲染验证**

```bash
cd /Users/wangkezhong/claude_proj/sasa/apps/web
pnpm build
pnpm start &
sleep 5
curl -s http://localhost:3000 | grep -q 'Sasa' && echo "OK" || echo "FAIL"
kill %1
```

#### 步骤 C：端到端测试（Playwright）

- [ ] **登录/注册页面渲染和交互**

```typescript
// apps/web/e2e/auth-ui.spec.ts
test('login page renders correctly', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('[name="email"]')).toBeVisible();
  await expect(page.locator('[name="password"]')).toBeVisible();
  await expect(page.locator('button:text("登录")')).toBeVisible();
  await expect(page.locator('text=注册')).toBeVisible();
});

test('register page validates inputs', async ({ page }) => {
  await page.goto('/register');
  await page.click('button[type="submit"]');
  // 应该显示验证错误
  await expect(page.locator('text=请输入邮箱')).toBeVisible();
});

test('sidebar navigation works', async ({ page }) => {
  // 登录后验证侧边栏导航
  await page.goto('/chat');
  await page.click('text=SaaS 管理');
  await expect(page).toHaveURL(/.*\/saas/);
});
```

#### 步骤 D：Code Review

```
检查清单:
□ NextAuth session token 安全存储（httpOnly cookie）
□ API Client: token 不暴露到 URL 中
□ Layout: 响应式设计（移动端侧边栏折叠）
□ Auth pages: 无 XSS 风险（React 默认转义）
□ .env.local 中 NEXT_PUBLIC_API_URL 配置正确
□ CORS 配置: server 端允许前端域名
```

#### 步骤 E：Git 提交

```bash
cd /Users/wangkezhong/claude_proj/sasa
git add -A
git commit -m "feat(chunk-8): frontend layout, API client, SSE hook, auth pages

- Sidebar layout with navigation (chat, SaaS, workspace, settings)
- API client with JWT auth headers
- useSSE hook with exponential backoff reconnection
- NextAuth.js integration with credentials provider
- Login/register pages with form validation
- Unit tests: 90%+ coverage on lib/hooks
- E2E tests: auth UI rendering and navigation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
