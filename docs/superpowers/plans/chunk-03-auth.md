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


## Chunk 3: Auth 模块

### Task 18: 用户注册接口

- [ ] **Step 1: 写测试**

```typescript
// apps/server/src/modules/auth/auth.service.spec.ts
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { DB } from '../../common/database/database.module';
import { CryptoService } from '../../common/crypto/crypto.service';

describe('AuthService.register', () => {
  let service: AuthService;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{
            id: 'user-1', email: 'test@test.com', name: 'Test', avatarUrl: null,
            createdAt: new Date(), updatedAt: new Date(),
          }]),
        }),
      }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue([]),
        }),
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        CryptoService,
        { provide: DB, useValue: mockDb },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('should register a new user and return user without password hash', async () => {
    const result = await service.register('test@test.com', 'password123', 'Test');
    expect(result.email).toBe('test@test.com');
    expect(result).not.toHaveProperty('passwordHash');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

- [ ] **Step 3: 实现 AuthService**

```typescript
// apps/server/src/modules/auth/auth.service.ts
import { Injectable, ConflictException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '../../common/database/database.module';
import { users } from '../../common/database/schema';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(@Inject(DB) private db: any) {}

  async register(email: string, password: string, name: string) {
    const existing = await this.db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) throw new ConflictException('Email already registered');

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    const [user] = await this.db.insert(users).values({ email, name, passwordHash }).returning();
    const { passwordHash: _, ...result } = user;
    return result;
  }
}
```

- [ ] **Step 4: 运行测试确认通过，提交**

```bash
git add -A && git commit -m "feat: add AuthService.register with email/password"
```

### Task 19: 用户登录接口（JWT）

- [ ] **Step 1: 安装 JWT 依赖**

```bash
cd /Users/wangkezhong/claude_proj/sasa/apps/server && pnpm add @nestjs/jwt @nestjs/passport passport passport-local passport-jwt && pnpm add -D @types/passport-local @types/passport-jwt
```

- [ ] **Step 2: 写测试**

```typescript
// auth.service.spec.ts 追加
it('should login with correct credentials and return JWT', async () => {
  mockDb.select = jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([{
        id: 'user-1', email: 'test@test.com', name: 'Test', passwordHash: crypto.createHash('sha256').update('password123').digest('hex'),
      }]),
    }),
  });
  const result = await service.login('test@test.com', 'password123');
  expect(result.accessToken).toBeDefined();
});
```

- [ ] **Step 3: 实现 login 方法 + JwtGuard**

```typescript
// auth.service.ts 追加
async login(email: string, password: string) {
  const [user] = await this.db.select().from(users).where(eq(users.email, email));
  if (!user) throw new UnauthorizedException('Invalid credentials');
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  if (hash !== user.passwordHash) throw new UnauthorizedException('Invalid credentials');
  const payload = { sub: user.id, email: user.email };
  return { accessToken: this.jwtService.sign(payload), user: { id: user.id, email: user.email, name: user.name } };
}
```

- [ ] **Step 4: 创建 JWT Guard**

```typescript
// apps/server/src/modules/auth/guards/jwt.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 5: 测试通过，提交**

```bash
git add -A && git commit -m "feat: add AuthService.login with JWT authentication"
```

### Task 20: Auth Controller（注册/登录 API 端点）

- [ ] **Step 1: 创建 DTO**

```typescript
// apps/server/src/modules/auth/dto/register.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';
export class RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsString() name: string;
}
```

```typescript
// apps/server/src/modules/auth/dto/login.dto.ts
import { IsEmail, IsString } from 'class-validator';
export class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}
```

- [ ] **Step 2: 创建 AuthController**

```typescript
// apps/server/src/modules/auth/auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password, dto.name);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }
}
```

- [ ] **Step 3: 创建 AuthModule 注册所有 providers**

```typescript
// apps/server/src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.NEXTAUTH_SECRET || 'dev-secret', signOptions: { expiresIn: '7d' } }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
```

- [ ] **Step 4: 更新 app.module.ts 引入 AuthModule**

- [ ] **Step 5: 验证 API**

```bash
curl -X POST http://localhost:4000/auth/register -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"123456","name":"Test"}'
```

Expected: 返回用户信息

- [ ] **Step 6: 提交**

```bash
git add -A && git commit -m "feat: add AuthController with register/login endpoints"
```

### Task 21: Workspace CRUD 接口

- [ ] **Step 1: 创建 WorkspaceService + 测试**

```typescript
// workspace.service.ts
async create(name: string, ownerId: string) {
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString(36);
  const [workspace] = await this.db.insert(workspaces).values({ name, slug, ownerId }).returning();
  await this.db.insert(workspaceMembers).values({ workspaceId: workspace.id, userId: ownerId, role: 'owner' });
  return workspace;
}

async findByUser(userId: string) {
  return this.db.select({ workspace: workspaces, role: workspaceMembers.role })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId));
}

async addMember(workspaceId: string, userId: string, role: 'admin' | 'member' = 'member') {
  return this.db.insert(workspaceMembers).values({ workspaceId, userId, role }).returning();
}
```

- [ ] **Step 2: 创建 WorkspaceController**

```typescript
@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspaceController {
  @Post() create(...) {}
  @Get() list(...) {}
  @Post(':id/members') addMember(...) {}
  @Get(':id/members') listMembers(...) {}
}
```

- [ ] **Step 3: 注册到 AuthModule（或独立 WorkspaceModule），提交**

```bash
git add -A && git commit -m "feat: add Workspace CRUD endpoints"
```

### Task 22: SaaS 账号绑定接口（API Key 方式）

- [ ] **Step 1: 创建 BindSaasDto**

```typescript
export class BindSaasDto {
  @IsString() connectorId: string;
  @IsString() authType: 'oauth2' | 'api_key';
  @IsString() credential: string;     // API Key 或 OAuth code
  @IsOptional() @IsString() saasUserId?: string;
  @IsOptional() @IsString() saasUsername?: string;
}
```

- [ ] **Step 2: 实现 SaaSBindingService**

```typescript
// saas-binding.service.ts
async bind(userId: string, dto: BindSaasDto) {
  const encrypted = this.crypto.encrypt(dto.credential);
  // 验证凭证
  const connector = this.connectorRegistry.get(dto.connectorId);
  const valid = await connector.validateCredentials(dto.credential);
  if (!valid) throw new UnauthorizedException('Invalid credentials');
  // 同步权限
  const permissions = await connector.fetchPermissions(dto.credential);
  // 存储
  const [binding] = await this.db.insert(saasBindings).values({
    userId, connectorId: dto.connectorId, authType: dto.authType,
    encryptedCred: encrypted, permissionsJson: permissions,
    saasUserId: dto.saasUserId, saasUsername: dto.saasUsername,
  }).returning();
  return binding;
}

async getBindings(userId: string) {
  return this.db.select().from(saasBindings).where(eq(saasBindings.userId, userId));
}

async unbind(userId: string, bindingId: string) {
  await this.db.delete(saasBindings).where(and(eq(saasBindings.id, bindingId), eq(saasBindings.userId, userId)));
}
```

- [ ] **Step 3: 创建 SaaSBindingController**

```typescript
@Controller('saas-bindings')
@UseGuards(JwtAuthGuard)
export class SaaSBindingController {
  @Post() bind(...) {}
  @Get() list(...) {}
  @Delete(':id') unbind(...) {}
}
```

- [ ] **Step 4: 测试，提交**

```bash
git add -A && git commit -m "feat: add SaaS account binding API (API Key flow)"
```

---

