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


## Chunk 4: Connector & Schema 模块

### Task 23: ConnectorRegistry 服务

- [ ] **Step 1: 写测试**

```typescript
describe('ConnectorRegistry', () => {
  it('should register and retrieve a connector', () => {
    const registry = new ConnectorRegistry();
    const connector = new DemoConnector();
    registry.register('demo', connector);
    expect(registry.get('demo')).toBe(connector);
  });

  it('should list all registered connectors', () => {
    const registry = new ConnectorRegistry();
    registry.register('demo-1', connector1);
    registry.register('demo-2', connector2);
    expect(registry.list()).toHaveLength(2);
  });

  it('should throw when getting unregistered connector', () => {
    const registry = new ConnectorRegistry();
    expect(() => registry.get('nonexistent')).toThrow();
  });
});
```

- [ ] **Step 2: 实现 ConnectorRegistry**

```typescript
// connector-registry.service.ts
@Injectable()
export class ConnectorRegistry {
  private connectors = new Map<string, SaaSConnector>();

  register(id: string, connector: SaaSConnector) { this.connectors.set(id, connector); }
  get(id: string): SaaSConnector {
    const c = this.connectors.get(id);
    if (!c) throw new NotFoundException(`Connector ${id} not found`);
    return c;
  }
  list(): { id: string; connector: SaaSConnector }[] {
    return Array.from(this.connectors.entries()).map(([id, connector]) => ({ id, connector }));
  }
}
```

- [ ] **Step 3: 测试通过，提交**

```bash
git add -A && git commit -m "feat: add ConnectorRegistry service"
```

### Task 24: Demo 连接器（用于开发测试）

- [ ] **Step 1: 实现 DemoConnector**

```typescript
// connector/connectors/demo/index.ts
export class DemoConnector extends BaseRestConnector {
  name = 'Demo ERP';
  version = '1.0.0';
  supportedAuthTypes = ['api_key'] as const;

  getBaseUrl() { return 'https://demo-erp.example.com/api'; }

  getToolDefinitions(): ConnectorToolDefinition[] {
    return [
      {
        name: 'submit_leave',
        displayName: '提交请假申请',
        description: '提交一个请假申请到 ERP 系统',
        parameters: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['annual', 'sick', 'personal'], description: '假期类型' },
            startDate: { type: 'string', format: 'date', description: '开始日期' },
            endDate: { type: 'string', format: 'date', description: '结束日期' },
            reason: { type: 'string', description: '请假原因' },
          },
          required: ['type', 'startDate', 'endDate'],
        },
        requiredPermission: 'leave:submit',
        riskLevel: 'write',
        apiMapping: { method: 'POST', path: '/leaves' },
      },
      {
        name: 'query_leave_balance',
        displayName: '查询假期余额',
        description: '查询当前用户的假期余额',
        parameters: { type: 'object', properties: {} },
        requiredPermission: 'leave:view',
        riskLevel: 'read',
        apiMapping: { method: 'GET', path: '/leaves/balance' },
      },
    ];
  }

  async validateCredentials(credentials: string): Promise<boolean> {
    return credentials.startsWith('demo-');
  }

  async fetchPermissions(credentials: string): Promise<string[]> {
    return ['leave:submit', 'leave:view', 'expense:create'];
  }
}
```

- [ ] **Step 2: 写测试验证 DemoConnector 的 Tool Definitions**

```typescript
describe('DemoConnector', () => {
  it('should return tool definitions', () => {
    const connector = new DemoConnector();
    const tools = connector.getToolDefinitions();
    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe('submit_leave');
  });

  it('should validate demo credentials', async () => {
    const connector = new DemoConnector();
    expect(await connector.validateCredentials('demo-key')).toBe(true);
    expect(await connector.validateCredentials('invalid')).toBe(false);
  });
});
```

- [ ] **Step 3: 测试通过，提交**

```bash
git add -A && git commit -m "feat: add DemoConnector for development testing"
```

### Task 25: Schema 解析服务（OpenAPI → ToolDefinition）

- [ ] **Step 1: 写测试**

```typescript
describe('SchemaParserService', () => {
  it('should parse a valid OpenAPI 3.0 document', () => {
    const parser = new SchemaParserService();
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/pets': {
          get: { operationId: 'listPets', summary: 'List pets', parameters: [], responses: { '200': { description: 'OK' } } },
          post: { operationId: 'createPet', summary: 'Create a pet', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } } } }, responses: { '201': { description: 'Created' } } },
        },
      },
    };
    const result = parser.parse(JSON.stringify(spec));
    expect(result.tools).toHaveLength(2);
    expect(result.tools[0].name).toBe('listPets');
    expect(result.tools[0].riskLevel).toBe('read');
    expect(result.tools[1].riskLevel).toBe('write');
  });

  it('should reject invalid OpenAPI documents', () => {
    const parser = new SchemaParserService();
    expect(() => parser.parse('{ invalid json')).toThrow();
    expect(() => parser.parse('{"not": "openapi"}')).toThrow();
  });
});
```

- [ ] **Step 2: 实现 SchemaParserService**

```typescript
// schema-parser.service.ts
@Injectable()
export class SchemaParserService {
  parse(rawJson: string): { tools: ParsedTool[] } {
    let spec: any;
    try { spec = JSON.parse(rawJson); } catch { throw new BadRequestException('Invalid JSON'); }
    if (!spec.openapi || !spec.paths) throw new BadRequestException('Invalid OpenAPI document: missing openapi or paths');
    const tools: ParsedTool[] = [];
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(methods as any)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
          const op = operation as any;
          tools.push({
            name: op.operationId || `${method}_${path.replace(/[{}\/]/g, '_')}`,
            description: op.summary || `${method.toUpperCase()} ${path}`,
            parameters: this.buildParameters(op),
            riskLevel: this.inferRiskLevel(method),
            apiMapping: { method: method.toUpperCase(), path },
          });
        }
      }
    }
    return { tools };
  }

  private buildParameters(op: any): Record<string, unknown> { /* 从 parameters + requestBody 构建 JSON Schema */ }
  private inferRiskLevel(method: string): 'read' | 'write' | 'delete' {
    if (method === 'get') return 'read';
    if (method === 'delete') return 'delete';
    return 'write';
  }
}
```

- [ ] **Step 3: 测试通过，提交**

```bash
git add -A && git commit -m "feat: add SchemaParserService for OpenAPI to ToolDefinition conversion"
```

### Task 26: Schema 上传与管理 API

- [ ] **Step 1: 创建 SchemaController**

```typescript
@Controller('schemas')
@UseGuards(JwtAuthGuard)
export class SchemaController {
  @Post('upload') upload(@Body() dto: UploadSchemaDto, @Req() req) { /* 解析 + 保存到 saas_connectors (draft) + 生成 tool_definitions */ }
  @Get('connectors') listConnectors(@Req() req) { /* 列出工作空间内连接器 */ }
  @Post('connectors/:id/publish') publish(@Param('id') id, @Req() req) { /* draft → active */ }
  @Patch('tools/:id') updateTool(@Param('id') id, @Body() dto) { /* 配置 requiredPermission 和 riskLevel */ }
}
```

- [ ] **Step 2: 实现 SchemaService**

```typescript
@Injectable()
export class SchemaService {
  async uploadAndParse(workspaceId: string | null, name: string, rawSchema: string) {
    const { tools } = this.parser.parse(rawSchema);
    const [connector] = await this.db.insert(saasConnectors).values({
      workspaceId, name, schemaJson: JSON.parse(rawSchema), status: 'draft', isBuiltin: false,
    }).returning();
    for (const tool of tools) {
      await this.db.insert(toolDefinitions).values({
        connectorId: connector.id, name: tool.name, description: tool.description,
        parametersJson: tool.parameters, riskLevel: tool.riskLevel, apiMappingJson: tool.apiMapping,
      });
    }
    return connector;
  }
}
```

- [ ] **Step 3: 测试，提交**

```bash
git add -A && git commit -m "feat: add Schema upload and management API"
```

---


---

### Chunk 4 验证流程

#### 步骤 A：补充单测（覆盖率 ≥ 90%）

- [ ] **为 ConnectorRegistry 补充测试**

```typescript
// connector-registry.service.spec.ts 追加
it('should overwrite when registering same id', () => { /* ... */ });
it('should return undefined for list when empty', () => { /* ... */ });
```

- [ ] **为 DemoConnector 补充 executeToolCall 测试**

```typescript
// demo/index.spec.ts 追加 — mock fetch 测试实际 HTTP 调用逻辑
it('should return TOOL_NOT_FOUND for unknown tool', async () => {
  const connector = new DemoConnector();
  const result = await connector.executeToolCall('unknown_tool', {}, 'demo-key');
  expect(result.success).toBe(false);
  expect(result.error?.code).toBe('TOOL_NOT_FOUND');
});
```

- [ ] **为 SchemaParserService 补充边界测试**

```typescript
// schema-parser.service.spec.ts 追加
it('should handle paths with path parameters', () => { /* ... */ });
it('should handle operations without operationId', () => { /* ... */ });
it('should handle operations without summary', () => { /* ... */ });
it('should handle DELETE method as risk level delete', () => { /* ... */ });
it('should handle empty paths object', () => { /* ... */ });
it('should handle YAML input (reject non-JSON)', () => { /* ... */ });
```

- [ ] **运行覆盖率检查**

```bash
cd /Users/wangkezhong/claude_proj/sasa/apps/server && pnpm test -- --coverage
```

#### 步骤 B：集成测试

- [ ] **Schema 上传 → 解析 → 发布全流程**

```typescript
// test/schema.integration.spec.ts
describe('Schema API (integration)', () => {
  it('should upload OpenAPI doc, parse tools, and publish', async () => {
    // 1. POST /schemas/upload with valid OpenAPI JSON
    // 2. GET /schemas/connectors → 验证 draft 状态
    // 3. PATCH /schemas/tools/:id → 配置 requiredPermission
    // 4. POST /schemas/connectors/:id/publish → 验证 active 状态
  });

  it('should reject invalid OpenAPI document', async () => {
    // POST /schemas/upload with invalid JSON → 400
  });
});
```

#### 步骤 C：端到端测试（Playwright）

- [ ] **SaaS 连接器添加和绑定 E2E**

```typescript
// apps/web/e2e/saas-connector.spec.ts
test('user can add demo connector and bind account', async ({ page }) => {
  // 前置: 已登录 + 已配置 LLM
  await page.goto('/saas');
  await page.click('text=添加 SaaS');
  await page.click('text=Demo ERP');
  await page.fill('[name="apiKey"]', 'demo-test-key');
  await page.click('button:text("绑定")');
  await expect(page.locator('text=Demo ERP')).toBeVisible();
  await expect(page.locator('text=已绑定')).toBeVisible();
});
```

#### 步骤 D：Code Review

```
检查清单:
□ BaseRestConnector.executeToolCall: 无 SSRF 风险（URL 校验）
□ SchemaParserService: 不信任用户输入，解析异常有兜底
□ DemoConnector: 仅用于开发，生产环境不可注册
□ ConnectorRegistry: 线程安全（Map 在 NestJS 单例中安全）
□ Schema upload: 文件大小限制、内容长度限制
□ tool_definitions: riskLevel 默认值合理（GET→read, POST→write）
```

#### 步骤 E：Git 提交

```bash
cd /Users/wangkezhong/claude_proj/sasa
git add -A
git commit -m "feat(chunk-4): connector registry, demo connector, OpenAPI schema parser

- ConnectorRegistry: register/get/list connectors
- DemoConnector: submit_leave + query_leave_balance for dev
- SchemaParserService: OpenAPI 3.x → ToolDefinition conversion
- SchemaService: upload, parse, publish (draft → active)
- Unit tests: 90%+ coverage
- Integration tests: full schema upload flow
- E2E tests: SaaS connector binding

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
