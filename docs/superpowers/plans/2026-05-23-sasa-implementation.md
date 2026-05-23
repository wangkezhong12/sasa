# Sasa AI Agent — Implementation Plan (Index)

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan.

**Goal:** 构建一个通过自然语言对话操作 SaaS 软件的 AI Agent 平台。

**Architecture:** TypeScript 全栈 Monorepo（Turborepo + pnpm）。后端 NestJS 单体模块化（Auth/Chat/Agent/Permission/Connector/Schema），前端 Next.js + shadcn/ui，PostgreSQL + Redis，Vercel AI SDK 集成多模型。

**Tech Stack:** NestJS, Next.js, Drizzle ORM, PostgreSQL, Redis, Vercel AI SDK, shadcn/ui, Tailwind CSS, NextAuth.js

**Spec:** `docs/superpowers/specs/2026-05-23-sasa-ai-agent-design.md`

---

## 每个 Chunk 的标准验证流程

每个 Chunk 完成开发后，必须按以下顺序执行验证：

| 步骤 | 说明 | 要求 |
|------|------|------|
| A. 单测 | 补充单元测试 | 覆盖率 ≥ 90% |
| B. 集成测试 | 验证模块间协作 | 全部通过 |
| C. E2E 测试 | Playwright 模拟真实场景 | 全部通过 |
| D. Code Review | 检查安全/质量风险点 | 无阻塞问题 |
| E. Git 提交 | 测试和 Review 通过后提交 | 带完整 commit message |

---

## Chunk 执行顺序

| # | 文件 | 内容 | 行数 |
|---|------|------|------|
| 1 | [chunk-01-monorepo-scaffolding.md](./chunk-01-monorepo-scaffolding.md) | Monorepo 脚手架、shared/sdk 包、NestJS/NextJS 初始化 | 949 |
| 2 | [chunk-02-database-infra.md](./chunk-02-database-infra.md) | Drizzle ORM、12 张表、CryptoService、RedisModule | 794 |
| 3 | [chunk-03-auth.md](./chunk-03-auth.md) | 用户注册/登录/JWT、Workspace CRUD、SaaS 绑定 | 694 |
| 4 | [chunk-04-connector-schema.md](./chunk-04-connector-schema.md) | ConnectorRegistry、DemoConnector、OpenAPI 解析、Schema 上传 API | 513 |
| 5 | [chunk-05-permission.md](./chunk-05-permission.md) | 权限过滤、Redis 缓存、审计日志 | 362 |
| 6 | [chunk-06-agent-engine.md](./chunk-06-agent-engine.md) | LLM 配置、Prompt 构建、上下文管理、确认管理、ToolRegistry、AgentService | 558 |
| 7 | [chunk-07-chat-gateway.md](./chunk-07-chat-gateway.md) | Conversation CRUD、SSE 推送、ChatController | 376 |
| 8 | [chunk-08-frontend-base.md](./chunk-08-frontend-base.md) | 布局侧边栏、API Client、SSE Hook、NextAuth 登录/注册 | 389 |
| 9 | [chunk-09-frontend-chat.md](./chunk-09-frontend-chat.md) | 聊天 UI 组件、对话页面集成 | 327 |
| 10 | [chunk-10-frontend-saas-settings.md](./chunk-10-frontend-saas-settings.md) | SaaS 管理页、LLM 配置页、工作空间设置 | 343 |
| 11 | [chunk-11-e2e-tests.md](./chunk-11-e2e-tests.md) | 后端 E2E 测试、Playwright 前端测试 | 259 |
| 12 | [chunk-12-spec-supplements.md](./chunk-12-spec-supplements.md) | Docker Compose、速率限制、RLS、Redis 降级、SSE 重连、OAuth 刷新等 | 780 |

## 依赖关系

```
Chunk 1 → Chunk 2 → Chunk 3 → Chunk 4 → Chunk 5 → Chunk 6 → Chunk 7
                                                                    ↓
Chunk 8 → Chunk 9 → Chunk 10 ←──────────────────────────────────────┘
                                              ↓
                              Chunk 11 (依赖 Chunk 1-10 完成)
                              Chunk 12 (可与 Chunk 5-7 并行，但建议串行)
```

**总计:** 62 个任务，12 个 Chunk，约 6344 行。
