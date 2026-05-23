# Sasa — AI Agent for SaaS Operations

## Context

用户希望通过自然语言对话来操作 SaaS 软件（如 ERP），例如通过对话提交请假申请表单。该产品定位为面向 C 端用户的可商用智能体应用，类似 Notion 的模式——个人用户独立使用，可选创建工作空间团队协作。平台本身不提供 LLM 服务，用户自行接入模型厂商 API。

## 技术栈

| 层次 | 技术 | 理由 |
|------|------|------|
| 后端框架 | NestJS | 模块化架构、依赖注入、装饰器元编程 |
| 数据库 | PostgreSQL | JSON 支持好，适合存储 API Schema 和对话上下文 |
| ORM | Drizzle ORM | 类型安全、轻量、性能好 |
| LLM 集成 | Vercel AI SDK | 统一多模型接口，内置流式输出、Tool Calling |
| 前端框架 | Next.js + React | SSR/CSR 灵活，Vercel AI SDK 原生支持 |
| UI 组件 | shadcn/ui + Tailwind | 可定制、适合商业产品 |
| 实时通信 | SSE（Server-Sent Events） | LLM 流式响应天然适配 |
| 缓存 | Redis | 会话状态缓存、权限缓存、速率限制 |
| 认证 | NextAuth.js (Auth.js) | 支持多种 OAuth Provider |
| 包管理 | Turborepo + pnpm workspace | Monorepo 管理 |

## 项目结构

```
sasa/
├── apps/
│   ├── web/              # Next.js 前端
│   └── server/           # NestJS 后端
├── packages/
│   ├── shared/           # 共享类型定义、工具函数
│   └── connector-sdk/    # SaaS 连接器开发 SDK
├── docs/
├── package.json
└── turbo.json
```

## 角色模型

采用类似 Notion 的模式：个人产品起步，可选创建工作空间协作。

### 角色

| 角色 | 说明 |
|------|------|
| 个人用户 | 独立使用，连接自己的 SaaS，个人聊天记录 |
| Workspace Owner | 创建工作空间，最高权限，管理空间设置、成员、套餐 |
| Workspace Admin | 管理成员、配置共享 SaaS 连接器 |
| Workspace Member | 使用 Agent，绑定自己的 SaaS 账号 |

### 设计要点

- 一个用户可拥有个人空间 + 加入多个工作空间
- SaaS 连接器定义属于工作空间（Owner/Admin 配置）
- SaaS 账号绑定是个人行为（每个成员绑定自己的账号和权限）
- 用户可在不同工作空间中拥有不同角色

### 配置层级

```
平台默认值 (代码内置) → 工作空间配置 (Owner/Admin 可覆盖) → 个人配置 (用户可覆盖)
```

例如确认超时时长：平台默认 5 分钟 → 工作空间设为 3 分钟 → 个人设为 10 分钟，最终生效 10 分钟。

## 系统架构

### 整体架构

单体模块化架构，一个 NestJS 应用内分层为独立模块，后续可按需拆分。

```
用户 (浏览器)
    │
    ▼
┌──────────────────────────────────────┐
│           Next.js 前端               │
│  聊天界面 / SaaS管理 / 用户设置      │
└──────────────┬───────────────────────┘
               │ HTTP + SSE
               ▼
┌──────────────────────────────────────┐
│           NestJS 后端                │
│                                      │
│  ┌────────────┐  ┌───────────────┐   │
│  │ Auth Module │  │ Chat Gateway  │   │
│  │ 用户认证    │  │ 对话入口/SSE  │   │
│  │ SaaS绑定   │  └───────┬───────┘   │
│  └────────────┘          │           │
│                          ▼           │
│                  ┌───────────────┐   │
│                  │ Agent Engine  │   │
│                  │ LLM调度       │   │
│                  │ Tool编排      │   │
│                  │ 上下文管理    │   │
│                  └───┬───────┬───┘   │
│                      │       │       │
│          ┌───────────┘       │       │
│          ▼                   ▼       │
│  ┌──────────────┐  ┌──────────────┐  │
│  │  Permission  │  │  Connector   │  │
│  │  权限预检    │  │  SaaS适配    │  │
│  │  工具过滤    │  │  REST/MCP/CLI│  │
│  │  审计日志    │  └──────┬───────┘  │
│  └──────────────┘         │         │
└───────────────────────────┼─────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
         SaaS API       SaaS MCP     SaaS CLI
          (ERP)        (未来)       (未来)
```

### 模块职责

#### Auth Module — 认证与绑定
- 用户注册/登录（邮箱 + OAuth）
- SaaS 账号绑定管理（OAuth2 授权流 / API Key 配置）
- 凭证安全存储（AES-256-GCM 加密存入 PostgreSQL）
- 对外接口：`AuthService`, `SaaSBindingService`

#### Chat Gateway — 对话入口
- 接收用户消息，通过 SSE 流式返回 Agent 响应
- 对话历史持久化
- 会话与 SaaS 上下文关联（当前对话操作哪个 SaaS）
- 处理 Tool Call 确认（接收前端确认/取消/修改参数）
- 对外接口：`ChatController`, `SSEService`

#### Agent Engine — 核心推理调度
- 调用 LLM（通过 Vercel AI SDK），支持 Tool Calling
- 管理对话上下文窗口（历史消息裁剪策略）
- 编排多步工具调用（单轮最多 5 步）
- 执行确认机制（所有 Tool Call 暂停，推送到前端等用户确认）
- 对外接口：`AgentService`, `ToolRegistry`

#### Permission Module — 安全防护
- 加载用户权限（绑定 SaaS 时通过 `connector.fetchPermissions()` 同步，本地 Redis 缓存）
- 权限同步触发时机：首次绑定、手动刷新、每次对话开始时检查缓存是否存在
- 缓存策略：Redis 存储，TTL 30 分钟，过期后下次对话自动重新同步
- 调用前过滤：根据用户权限从 ToolRegistry 中移除无权限的工具
- 操作风险分级（read/write/delete），高风险操作在确认卡片上醒目标红
- 审计日志：记录每次工具调用（谁、何时、调了什么、结果），只能追加不可修改
- 对外接口：`PermissionGuard`, `AuditService`

#### Connector Module — SaaS 适配层
- 统一的 `SaaSConnector` 接口，屏蔽不同协议差异
- 内置连接器（预置实现）
- 用户上传 OpenAPI 文档后自动生成自定义连接器
- 管理 API Schema → Tool 定义的映射
- 对外接口：`ConnectorRegistry`, `SchemaParserService`

#### Schema Module — API 定义管理
- 存储和管理 SaaS API 的 Schema（OpenAPI 文档解析结果）
- 将 API Schema 转换为 LLM Tool Calling 可用的 Tool Definition
- 预置连接器的 Schema 版本管理
- 对外接口：`SchemaService`, `ToolDefinitionBuilder`

## 数据模型

### 核心表

```sql
-- 用户
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 工作空间
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES users(id),
  settings_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 工作空间成员
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(20) NOT NULL DEFAULT 'member', -- 'owner' | 'admin' | 'member'
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- SaaS 连接器定义
CREATE TABLE saas_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id), -- NULL 表示预置连接器
  name VARCHAR(100) NOT NULL,
  type VARCHAR(10) NOT NULL DEFAULT 'rest', -- v1 仅 'rest'，预留 'mcp'/'cli' 供后续迭代
  version VARCHAR(20),
  schema_json JSONB NOT NULL,             -- OpenAPI 文档解析结果
  config_json JSONB DEFAULT '{}',         -- 连接器专属配置
  is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
  api_base_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',  -- 预置为 'active'，自定义经历 'draft' → 'active'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 用户与 SaaS 的账号绑定
CREATE TABLE saas_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  connector_id UUID NOT NULL REFERENCES saas_connectors(id),
  saas_user_id VARCHAR(255),              -- SaaS 侧的用户标识
  saas_username VARCHAR(255),
  auth_type VARCHAR(20) NOT NULL,         -- 'oauth2' | 'api_key'
  encrypted_cred BYTEA NOT NULL,          -- AES-256-GCM 加密的凭证
  permissions_json JSONB DEFAULT '[]',    -- 权限快照
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, connector_id)  -- 一个用户对同一个连接器只绑定一个 SaaS 账号；如需多账号（如不同 ERP 租户），通过创建不同工作空间的连接器实例实现
);

-- 对话
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  workspace_id UUID REFERENCES workspaces(id),
  connector_id UUID REFERENCES saas_connectors(id),
  title VARCHAR(255),
  context_json JSONB DEFAULT '{}',        -- 会话级上下文
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 消息
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  role VARCHAR(20) NOT NULL,              -- 'user' | 'assistant' | 'system' | 'tool'
  content TEXT,
  tool_calls_json JSONB,                  -- assistant 发起的工具调用
  tool_results_json JSONB,                -- 工具调用结果
  confirmation_id UUID,                   -- 关联的确认请求 ID
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 工具定义（从 Schema 解析生成）
CREATE TABLE tool_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES saas_connectors(id),
  name VARCHAR(100) NOT NULL,             -- LLM 可调用的工具名
  description TEXT NOT NULL,              -- 给 LLM 看的功能描述
  parameters_json JSONB NOT NULL,         -- 参数的 JSON Schema
  required_permission VARCHAR(100),       -- 所需权限标识
  risk_level VARCHAR(10) NOT NULL DEFAULT 'read', -- 'read' | 'write' | 'delete'
  api_mapping_json JSONB NOT NULL,        -- HTTP 方法、路径、参数映射
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 审计日志（只追加）
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  conversation_id UUID REFERENCES conversations(id),
  tool_name VARCHAR(100) NOT NULL,
  saas_endpoint TEXT NOT NULL,
  request_json JSONB,
  response_status INTEGER,
  response_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- LLM 配置（用户/工作空间级，平台不提供默认模型）
CREATE TABLE llm_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope VARCHAR(20) NOT NULL,             -- 'workspace' | 'user'
  scope_id UUID NOT NULL,                 -- workspace_id 或 user_id
  provider_id VARCHAR(50) NOT NULL,       -- 'openai' | 'anthropic' | 'deepseek' | 'custom'
  model_id VARCHAR(100) NOT NULL,
  api_key_encrypted BYTEA NOT NULL,       -- AES-256-GCM 加密
  base_url TEXT,                          -- 支持自定义端点
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 系统配置
CREATE TABLE system_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope VARCHAR(20) NOT NULL,             -- 'workspace' | 'user'
  scope_id UUID NOT NULL,
  key VARCHAR(100) NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(scope, scope_id, key)
);
-- 存储如 confirmation_timeout_seconds 等配置项
```

## Agent 核心工作流

### 一次对话的完整生命周期

1. **Chat Gateway 接收** — 用户发送消息，加载会话上下文，关联 SaaS 绑定
2. **Permission Module 过滤** — 加载用户权限，过滤出有权限的 Tool Definitions
3. **Agent Engine 构建请求** — 拼接 System Prompt + 历史 + 过滤后的工具集，调用 LLM
4. **LLM 返回** — 可能是直接回复或 Tool Call
5. **Tool Call 处理** — 暂停执行，推送确认信息到前端
6. **用户确认** — 前端展示确认卡片，用户确认/取消/修改参数
7. **执行并回传** — 使用用户凭证调用 SaaS API，记录审计日志，结果回传 LLM
8. **LLM 生成回复** — 自然语言总结操作结果，SSE 流式返回

### System Prompt 构成

动态拼接以下部分：
- **基础身份**（固定）：SaaS 操作助手角色定义
- **当前上下文**（每轮动态）：连接的 SaaS 名称、用户角色、当前时间
- **操作约束**（固定）：参数完整性要求、追问策略、禁止编造参数
- **SaaS 专属指令**（连接器提供）：如日期格式、特殊业务规则

### 上下文窗口管理

- 始终保留：System Prompt、Tool Definitions
- Tool Definitions 总量较大时（超过 50 个），仅发送与当前对话上下文相关的子集（根据用户最近操作推断）
- 保留最近 10 轮完整对话（一轮 = 用户消息 + Agent 回复 + 可能的 Tool Call/Result）
- 总 token 预算：System Prompt + Tool Definitions + 历史消息总和不超过模型上下文窗口的 80%，预留 20% 给输出。超出时从最早的历史消息开始丢弃
- 后续迭代可引入 LLM 摘要压缩

### 多步工具调用

单轮最多 5 步工具调用链。Agent Engine 循环执行 Tool Call → 结果回传 LLM → LLM 决定下一步，直到 LLM 不再发起 Tool Call。达到 5 步上限时，Agent Engine 中止后续 Tool Call，将已收集的结果回传 LLM 并附加提示"已达到单轮最大操作步数，请基于已有结果总结回复用户"。

## Tool Call 确认机制

**所有 Tool Call 执行前，必须在前端展示确认卡片，用户点击确认后才执行。**

### 确认流程

```
LLM 返回 Tool Call → Agent Engine 暂停 → SSE 推送确认请求到前端
    │
    ├── 用户确认 → 执行 Tool Call
    ├── 用户取消 → 通知 LLM 操作被取消
    └── 用户修改参数 → 使用新参数重新执行
```

### 确认请求超时

- 默认 5 分钟，可配置（system_configs 表中 `confirmation_timeout_seconds`）
- 配置层级：平台默认 → 工作空间 → 个人
- 超时未响应视为取消
- 超时实现：Agent Engine 在内存中维护一个 `Map<confirmationId, { timer, resolve }>` 的 pending confirmations 映射。收到用户确认时清除定时器并 resolve；定时器到期时自动 resolve 为 cancel。服务器重启时，pending confirmations 丢失，前端重连后如发现未确认的操作，显示"操作已因超时取消"提示

### SSE 协议

```
推送: event: tool_confirmation_required
      data: { confirmation_id, tool_name, display_name,
              risk_level, parameters }

回传: POST /api/chat/confirm
      { confirmation_id, action: "confirm"|"cancel"|"modify",
        modified_parameters? }
```

## SaaS 连接器体系

### 连接器接口

```typescript
interface SaaSConnector {
  name: string;
  version: string;
  protocol: 'rest' | 'mcp' | 'cli';       // v1 仅 'rest'
  supportedAuthTypes: ('oauth2' | 'api_key')[];
  validateCredentials(credentials: EncryptedCred): Promise<boolean>;
  getToolDefinitions(): ToolDefinition[];
  fetchPermissions(credentials: EncryptedCred): Promise<string[]>;
  executeToolCall(
    toolName: string,
    parameters: Record<string, unknown>,
    credentials: EncryptedCred
  ): Promise<ToolResult>;
}

interface ToolDefinition {
  name: string;
  displayName: string;
  description: string;
  parameters: JSONSchema;
  requiredPermission: string;
  riskLevel: 'read' | 'write' | 'delete';
  apiMapping: {
    method: string;
    path: string;
    bodyMapping?: ParameterMapping;
    headerMapping?: ParameterMapping;
    queryMapping?: ParameterMapping;
  };
}
```

### 连接器来源

**预置连接器**：代码内置，随版本发布
```
packages/connector-sdk/connectors/
├── kingdee/           # 金蝶云星空
├── sap/
└── registry.ts
```

**自定义连接器**：用户上传 OpenAPI JSON/YAML → 自动解析生成 Tool Definitions → 管理员配置 requiredPermission 和 riskLevel → 保存到数据库

### 自定义连接器生成流程

1. 用户上传 OpenAPI JSON/YAML 文档
2. Schema Module 校验文档格式（必须为有效的 OpenAPI 3.x），拒绝格式错误的文档并提示具体错误
3. 解析文档，提取每个 API 端点的路径、方法、参数、描述
4. 自动生成 `tool_definitions` 记录（name、description、parameters_json、api_mapping_json）
5. 生成的连接器进入 `draft` 状态，此时用户不可使用
6. 管理员在管理界面中为每个 Tool 配置 `required_permission` 和 `risk_level`（系统根据 HTTP 方法给出默认建议：GET→read、POST/PUT→write、DELETE→delete）
7. 管理员确认发布，连接器状态变为 `active`，工作空间内用户可绑定使用

`saas_connectors` 表增加 `status` 字段（已合并至上方 CREATE TABLE 中）。

注：确认超时的 pending confirmations 使用内存 Map 存储，服务器重启时会丢失。这是 v1 的已知简化，任何进行中的工具调用确认在重启后将视为超时取消。

### 权限映射

连接器定义 Tools → 每个 Tool 标注 required_permission → 用户绑定 SaaS 后同步 permissions_json → 对话前对比过滤。

## LLM 集成

### 多模型支持

- 用户/工作空间自备 API Key，平台不提供默认模型
- 首次使用强制引导配置 LLM（选择供应商、填入 API Key、选模型），未配置时聊天界面显示配置引导页，禁用消息输入
- 支持供应商：OpenAI、Anthropic、DeepSeek、自定义端点
- 配置查找：用户个人配置 → 工作空间配置 → 都没有则拦截并显示引导页
- 运行时 API Key 失效（被撤销/余额不足）：LLM 调用返回认证错误时，Agent Engine 中止当前对话，前端弹出提示"模型 API Key 已失效，请检查配置"并提供跳转设置页的按钮，不自动重试

### 模型要求

必须支持 Tool Calling（Function Calling）。

### 加载方式

通过 Vercel AI SDK 统一接口，根据用户配置动态加载对应 provider 和 model。

## 前端设计

### 页面结构

- 侧边栏：对话列表、SaaS 管理、工作空间（如已加入）、个人设置
- 主内容区：根据侧边栏选中项切换
- 聊天界面顶部可切换当前操作的 SaaS（切换后，后续消息在当前对话中关联新的 connector_id，历史消息保持原关联不变）

### 聊天界面

- 消息气泡展示用户和 Agent 对话
- Tool Call 确认卡片内嵌在对话流中
- 确认卡片包含操作名称、参数详情、确认/取消按钮
- 底部输入框 + SaaS 选择器 + 发送按钮

### SaaS 管理页

- 展示已连接的 SaaS 卡片（状态、认证方式、管理/断开按钮）
- 添加 SaaS：选择预置连接器 或 上传 OpenAPI 文档

## 错误处理

| 错误类型 | 处理方式 |
|---------|---------|
| SaaS API 业务错误 | 错误回传 LLM → 自然语言解释并建议 |
| SaaS API 网络超时 | 自动重试 1 次 → 仍失败通知用户 |
| SaaS API 认证失败 | 提示凭证过期 → 引导重新绑定 |
| OAuth Token 过期 | 自动用 refresh_token 刷新 → 失败则引导重新授权 |
| LLM API 调用失败 | 提示模型服务异常 → 建议检查 API Key |
| LLM 幻觉 | Connector 层参数校验拦截 → 返回错误让 LLM 自纠 |
| 用户确认超时 | 视为取消 → LLM 生成超时提示 |
| Redis 不可用 | 权限缓存降级为数据库直查，速率限制临时关闭并记录告警日志，会话状态使用内存临时替代 |
| 数据库不可用 | 返回 503 服务暂不可用，不重试（避免雪崩），前端显示维护提示 |
| SSE 连接中断 | 前端自动重连（指数退避），重连后通过最后一条消息 ID 恢复流式传输；如重连时 Tool Call 确认已超时，显示超时提示 |

## 安全措施

- **凭证安全**：AES-256-GCM 加密存储，密钥通过环境变量注入不落库
- **传输安全**：全站 HTTPS，SSE 连接 JWT 认证
- **操作安全**：所有 Tool Call 前端确认，审计日志只追加不可修改
- **审计日志不可变性**：应用层禁止 UPDATE/DELETE 操作（Repository 层仅暴露 `create` 和 `find` 方法），数据库层通过 PostgreSQL Row Level Security 策略限制审计表只能 INSERT 和 SELECT
- **审计日志保留策略**：默认保留 90 天，通过定时任务清理超期记录（保留策略可通过 system_configs 配置）
- **数据隔离**：工作空间间数据严格隔离（所有查询带 workspace_id 过滤）
- **速率限制**：用户级 20次/分钟，工作空间级 100次/分钟，SaaS 连接器级可配置，Redis 滑动窗口实现

## TODO（后续迭代）

- [ ] 多层防御全部实现：工具级权限映射（第一层）
- [ ] 对话历史摘要压缩（替代简单裁剪）
- [ ] MCP 协议支持
- [ ] CLI 协议支持
- [ ] 移动端适配
- [ ] SaaS 连接器市场（社区贡献连接器）
