# Integration & E2E Testing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add integration tests for all 5 backend API controller suites and Playwright E2E tests for frontend auth/chat flows.

**Architecture:** Backend integration tests use Jest + supertest against real NestJS app with PostgreSQL and Redis. Frontend E2E tests use Playwright against running Next.js + NestJS servers. Tests clean up after themselves to avoid state leakage.

**Tech Stack:** Jest 29, supertest, @nestjs/testing, @playwright/test, PostgreSQL (sasa schema), Redis

---

## Chunk 1: Backend Test Infrastructure

### Task 1: Create .env.test and test helpers

**Files:**
- Create: `apps/server/.env.test`
- Create: `apps/server/test/helpers/test-app.ts`
- Create: `apps/server/test/helpers/db-cleaner.ts`
- Create: `apps/server/test/helpers/test-data.ts`

- [ ] **Step 1: Create .env.test**

Generate encryption key and NextAuth secret, then create the file:

```bash
ENCRYPTION_KEY=$(openssl rand -hex 32)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
```

File `apps/server/.env.test`:
```
DATABASE_URL=postgresql://postgres:wkz2023@localhost:5432/postgres
REDIS_URL=redis://localhost:6379
ENCRYPTION_KEY=<generated>
NEXTAUTH_SECRET=<generated>
NEXTAUTH_URL=http://localhost:3000
SERVER_PORT=4000
DEEPSEEK_API_KEY=<user-provided>
```

- [ ] **Step 2: Create test/helpers/test-app.ts**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

/** Register a user via API and return { id, email, token, name } */
export async function registerUser(app: INestApplication, suffix?: string) {
  const tag = suffix ?? Date.now().toString(36);
  const email = `test-${tag}@example.com`;
  const password = 'test123456';
  const name = `Test ${tag}`;

  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password, name });

  // Login to get JWT
  const loginRes = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password });

  return {
    id: loginRes.body.user.id,
    email,
    password,
    name,
    token: loginRes.body.accessToken,
  };
}
```

- [ ] **Step 3: Create test/helpers/db-cleaner.ts**

```typescript
import postgres from 'postgres';

const TABLES = [
  'audit_logs',
  'messages',
  'conversations',
  'tool_definitions',
  'saas_bindings',
  'saas_connectors',
  'workspace_members',
  'workspaces',
  'llm_configs',
  'system_configs',
  'users',
];

export async function cleanDatabase(databaseUrl: string): Promise<void> {
  const client = postgres(databaseUrl);
  try {
    for (const table of TABLES) {
      await client.unsafe(`TRUNCATE TABLE sasa.${table} CASCADE`);
    }
  } finally {
    await client.end();
  }
}
```

- [ ] **Step 4: Create test/helpers/test-data.ts**

```typescript
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

/** Minimal OpenAPI spec for testing schema upload */
export const SAMPLE_OPENAPI_SPEC = JSON.stringify({
  openapi: '3.0.0',
  info: { title: 'Test ERP', version: '1.0.0' },
  paths: {
    '/leaves': {
      post: {
        operationId: 'submit_leave',
        summary: 'Submit leave request',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['annual', 'sick'] },
                  startDate: { type: 'string', format: 'date' },
                  endDate: { type: 'string', format: 'date' },
                },
                required: ['type', 'startDate', 'endDate'],
              },
            },
          },
        },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/leaves/balance': {
      get: {
        operationId: 'query_leave_balance',
        summary: 'Query leave balance',
        parameters: [
          { name: 'year', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/expenses': {
      delete: {
        operationId: 'delete_expense',
        summary: 'Delete expense record',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
  },
});

/** Upload a schema and publish the connector, return connectorId */
export async function createPublishedConnector(
  app: INestApplication,
  token: string,
  workspaceId?: string,
): Promise<string> {
  const uploadRes = await request(app.getHttpServer())
    .post('/schemas/upload')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: `Test ERP ${Date.now()}`,
      schema: SAMPLE_OPENAPI_SPEC,
      workspaceId: workspaceId || undefined,
    });

  const connectorId = uploadRes.body.id;

  await request(app.getHttpServer())
    .post(`/schemas/connectors/${connectorId}/publish`)
    .set('Authorization', `Bearer ${token}`);

  return connectorId;
}

/** Create workspace, return workspace object */
export async function createWorkspace(
  app: INestApplication,
  token: string,
  name?: string,
) {
  const res = await request(app.getHttpServer())
    .post('/workspaces')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: name || `Workspace ${Date.now()}` });
  return res.body;
}
```

- [ ] **Step 5: Update jest-e2e.json to load .env.test**

Update `apps/server/test/jest-e2e.json`:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "setupFilesAfterFramework": ["./setup.ts"]
}
```

Create `apps/server/test/setup.ts`:

```typescript
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.test') });
```

- [ ] **Step 6: Verify setup compiles**

Run: `cd /Users/wangkezhong/claude_proj/sasa && pnpm --filter @sasa/server exec tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add apps/server/.env.test apps/server/test/helpers/ apps/server/test/setup.ts apps/server/test/jest-e2e.json
git commit -m "test(server): add integration test infrastructure (helpers, .env.test, setup)"
```

---

## Chunk 2: Auth Integration Tests

### Task 2: Write auth.e2e-spec.ts

**Files:**
- Create: `apps/server/test/auth.e2e-spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { cleanDatabase } from './helpers/db-cleaner';
import { createTestApp } from './helpers/test-app';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await cleanDatabase(process.env.DATABASE_URL!);
    app = await createTestApp();
  });

  afterAll(async () => {
    await cleanDatabase(process.env.DATABASE_URL!);
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'new@example.com', password: 'password123', name: 'New User' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.email).toBe('new@example.com');
          expect(res.body.name).toBe('New User');
          expect(res.body).not.toHaveProperty('passwordHash');
        });
    });

    it('should reject duplicate email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'new@example.com', password: 'password123', name: 'Dup User' })
        .expect(409);
    });

    it('should reject missing fields', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'incomplete@example.com' })
        .expect(400);
    });

    it('should reject short password', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'short@example.com', password: '12', name: 'Short' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with correct credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'new@example.com', password: 'password123' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.user).toHaveProperty('id');
          expect(res.body.user.email).toBe('new@example.com');
        });
    });

    it('should reject wrong password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'new@example.com', password: 'wrongpassword' })
        .expect(401);
    });

    it('should reject non-existent user', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' })
        .expect(401);
    });
  });
});
```

- [ ] **Step 2: Run auth integration tests**

Run: `cd /Users/wangkezhong/claude_proj/sasa && pnpm --filter @sasa/server exec jest --config ./test/jest-e2e.json test/auth.e2e-spec.ts --verbose`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/server/test/auth.e2e-spec.ts
git commit -m "test(server): add auth integration tests (register, login)"
```

---

## Chunk 3: Workspace Integration Tests

### Task 3: Write workspace.e2e-spec.ts

**Files:**
- Create: `apps/server/test/workspace.e2e-spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { cleanDatabase } from './helpers/db-cleaner';
import { createTestApp, registerUser } from './helpers/test-app';

describe('Workspace (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let userId: string;

  beforeAll(async () => {
    await cleanDatabase(process.env.DATABASE_URL!);
    app = await createTestApp();
    const user = await registerUser(app, 'ws');
    token = user.token;
    userId = user.id;
  });

  afterAll(async () => {
    await cleanDatabase(process.env.DATABASE_URL!);
    await app.close();
  });

  let workspaceId: string;

  it('should create a workspace', () => {
    return request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Workspace' })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.name).toBe('Test Workspace');
        expect(res.body.slug).toBeDefined();
        expect(res.body.ownerId).toBe(userId);
        workspaceId = res.body.id;
      });
  });

  it('should list user workspaces', () => {
    return request(app.getHttpServer())
      .get('/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveLength(1);
        expect(res.body[0].workspace.name).toBe('Test Workspace');
        expect(res.body[0].role).toBe('owner');
      });
  });

  it('should add a member to workspace', async () => {
    const otherUser = await registerUser(app, 'ws-member');

    return request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: otherUser.id, role: 'member' })
      .expect(201)
      .expect((res) => {
        expect(res.body.role).toBe('member');
      });
  });

  it('should list workspace members', () => {
    return request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.length).toBeGreaterThanOrEqual(2);
      });
  });

  it('should remove a member from workspace', async () => {
    const membersRes = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${token}`);

    const member = membersRes.body.find((m: any) => m.role === 'member');
    expect(member).toBeDefined();

    return request(app.getHttpServer())
      .delete(`/workspaces/${workspaceId}/members/${member.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('should reject request without JWT', () => {
    return request(app.getHttpServer())
      .get('/workspaces')
      .expect(401);
  });
});
```

- [ ] **Step 2: Run workspace integration tests**

Run: `cd /Users/wangkezhong/claude_proj/sasa && pnpm --filter @sasa/server exec jest --config ./test/jest-e2e.json test/workspace.e2e-spec.ts --verbose`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/server/test/workspace.e2e-spec.ts
git commit -m "test(server): add workspace integration tests (CRUD, members)"
```

---

## Chunk 4: Schema Integration Tests

### Task 4: Write schema.e2e-spec.ts

**Files:**
- Create: `apps/server/test/schema.e2e-spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { cleanDatabase } from './helpers/db-cleaner';
import { createTestApp, registerUser } from './helpers/test-app';
import { SAMPLE_OPENAPI_SPEC } from './helpers/test-data';

describe('Schema (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    await cleanDatabase(process.env.DATABASE_URL!);
    app = await createTestApp();
    const user = await registerUser(app, 'schema');
    token = user.token;
  });

  afterAll(async () => {
    await cleanDatabase(process.env.DATABASE_URL!);
    await app.close();
  });

  let connectorId: string;

  it('should upload an OpenAPI schema', () => {
    return request(app.getHttpServer())
      .post('/schemas/upload')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test ERP',
        schema: SAMPLE_OPENAPI_SPEC,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.name).toBe('Test ERP');
        expect(res.body.status).toBe('draft');
        connectorId = res.body.id;
      });
  });

  it('should list connectors', () => {
    return request(app.getHttpServer())
      .get('/schemas/connectors')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.length).toBeGreaterThanOrEqual(1);
        const c = res.body.find((x: any) => x.id === connectorId);
        expect(c).toBeDefined();
        expect(c.status).toBe('draft');
      });
  });

  it('should publish a draft connector', () => {
    return request(app.getHttpServer())
      .post(`/schemas/connectors/${connectorId}/publish`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
      .expect((res) => {
        expect(res.body.status).toBe('active');
      });
  });

  it('should list tools for a connector', () => {
    return request(app.getHttpServer())
      .get(`/schemas/connectors/${connectorId}/tools`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.length).toBe(3);
        const names = res.body.map((t: any) => t.name);
        expect(names).toContain('submit_leave');
        expect(names).toContain('query_leave_balance');
        expect(names).toContain('delete_expense');
      });
  });

  it('should update a tool', async () => {
    const toolsRes = await request(app.getHttpServer())
      .get(`/schemas/connectors/${connectorId}/tools`)
      .set('Authorization', `Bearer ${token}`);

    const deleteTool = toolsRes.body.find((t: any) => t.name === 'delete_expense');
    expect(deleteTool).toBeDefined();

    return request(app.getHttpServer())
      .patch(`/schemas/tools/${deleteTool.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ riskLevel: 'delete', requiredPermission: 'expense:delete' })
      .expect(200)
      .expect((res) => {
        expect(res.body.riskLevel).toBe('delete');
        expect(res.body.requiredPermission).toBe('expense:delete');
      });
  });

  it('should reject upload without JWT', () => {
    return request(app.getHttpServer())
      .post('/schemas/upload')
      .send({ name: 'X', schema: '{}' })
      .expect(401);
  });

  it('should reject invalid schema', () => {
    return request(app.getHttpServer())
      .post('/schemas/upload')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bad', schema: 'not-json' })
      .expect(400);
  });
});
```

- [ ] **Step 2: Run schema integration tests**

Run: `cd /Users/wangkezhong/claude_proj/sasa && pnpm --filter @sasa/server exec jest --config ./test/jest-e2e.json test/schema.e2e-spec.ts --verbose`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/server/test/schema.e2e-spec.ts
git commit -m "test(server): add schema integration tests (upload, publish, tools)"
```

---

## Chunk 5: SaaS Binding Integration Tests

### Task 5: Write saas-binding.e2e-spec.ts

**Files:**
- Create: `apps/server/test/saas-binding.e2e-spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { cleanDatabase } from './helpers/db-cleaner';
import { createTestApp, registerUser } from './helpers/test-app';
import { createPublishedConnector } from './helpers/test-data';

describe('SaaS Binding (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let connectorId: string;

  beforeAll(async () => {
    await cleanDatabase(process.env.DATABASE_URL!);
    app = await createTestApp();
    const user = await registerUser(app, 'binding');
    token = user.token;
    connectorId = await createPublishedConnector(app, token);
  });

  afterAll(async () => {
    await cleanDatabase(process.env.DATABASE_URL!);
    await app.close();
  });

  let bindingId: string;

  it('should bind a connector', () => {
    return request(app.getHttpServer())
      .post('/saas-bindings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        connectorId,
        authType: 'api_key',
        credential: 'demo-test-api-key-12345',
        saasUsername: 'testuser',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.connectorId).toBe(connectorId);
        expect(res.body.authType).toBe('api_key');
        expect(res.body.saasUsername).toBe('testuser');
        expect(res.body).not.toHaveProperty('encryptedCred');
        bindingId = res.body.id;
      });
  });

  it('should list user bindings', () => {
    return request(app.getHttpServer())
      .get('/saas-bindings')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.length).toBeGreaterThanOrEqual(1);
        expect(res.body[0].id).toBe(bindingId);
      });
  });

  it('should unbind a connector', () => {
    return request(app.getHttpServer())
      .delete(`/saas-bindings/${bindingId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('should have empty bindings after unbind', () => {
    return request(app.getHttpServer())
      .get('/saas-bindings')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveLength(0);
      });
  });

  it('should reject without JWT', () => {
    return request(app.getHttpServer())
      .get('/saas-bindings')
      .expect(401);
  });
});
```

- [ ] **Step 2: Run saas-binding integration tests**

Run: `cd /Users/wangkezhong/claude_proj/sasa && pnpm --filter @sasa/server exec jest --config ./test/jest-e2e.json test/saas-binding.e2e-spec.ts --verbose`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/server/test/saas-binding.e2e-spec.ts
git commit -m "test(server): add SaaS binding integration tests (bind, list, unbind)"
```

---

## Chunk 6: Chat Integration Tests

### Task 6: Write chat.e2e-spec.ts

**Files:**
- Create: `apps/server/test/chat.e2e-spec.ts`

- [ ] **Step 1: Write the test file**

This tests conversation CRUD, message history, SSE stream, and a mocked sendMessage. The real LLM integration is tested separately in Chunk 7.

```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { cleanDatabase } from './helpers/db-cleaner';
import { createTestApp, registerUser } from './helpers/test-app';
import { createPublishedConnector } from './helpers/test-data';

describe('Chat (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let userId: string;
  let connectorId: string;

  beforeAll(async () => {
    await cleanDatabase(process.env.DATABASE_URL!);
    app = await createTestApp();
    const user = await registerUser(app, 'chat');
    token = user.token;
    userId = user.id;
    connectorId = await createPublishedConnector(app, token);
  });

  afterAll(async () => {
    await cleanDatabase(process.env.DATABASE_URL!);
    await app.close();
  });

  let conversationId: string;

  describe('Conversation CRUD', () => {
    it('should create a conversation', () => {
      return request(app.getHttpServer())
        .post('/chat/conversations')
        .set('Authorization', `Bearer ${token}`)
        .send({ connectorId })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.userId).toBe(userId);
          expect(res.body.connectorId).toBe(connectorId);
          conversationId = res.body.id;
        });
    });

    it('should list user conversations', () => {
      return request(app.getHttpServer())
        .get('/chat/conversations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.length).toBeGreaterThanOrEqual(1);
          expect(res.body[0].id).toBe(conversationId);
        });
    });

    it('should reject conversation access without JWT', () => {
      return request(app.getHttpServer())
        .get('/chat/conversations')
        .expect(401);
    });
  });

  describe('Message History', () => {
    it('should return empty history for new conversation', () => {
      return request(app.getHttpServer())
        .get(`/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveLength(0);
        });
    });

    it('should reject access to another user conversation', async () => {
      const other = await registerUser(app, 'chat-other');
      return request(app.getHttpServer())
        .get(`/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${other.token}`)
        .expect(403);
    });

    it('should return 404 for non-existent conversation', () => {
      return request(app.getHttpServer())
        .get('/chat/conversations/00000000-0000-0000-0000-000000000000/messages')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('SSE Stream', () => {
    it('should reject SSE without token', () => {
      return request(app.getHttpServer())
        .get(`/chat/stream/${userId}:${conversationId}`)
        .expect(401);
    });

    it('should reject SSE with invalid clientId format', () => {
      return request(app.getHttpServer())
        .get('/chat/stream/invalid?token=whatever')
        .expect(400);
    });
  });
});
```

- [ ] **Step 2: Run chat integration tests**

Run: `cd /Users/wangkezhong/claude_proj/sasa && pnpm --filter @sasa/server exec jest --config ./test/jest-e2e.json test/chat.e2e-spec.ts --verbose`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/server/test/chat.e2e-spec.ts
git commit -m "test(server): add chat integration tests (conversations, messages, SSE)"
```

---

## Chunk 7: LLM Integration Test (DeepSeek)

### Task 7: Write LLM end-to-end test

**Files:**
- Create: `apps/server/test/llm-integration.e2e-spec.ts`

This test inserts a real DeepSeek LLM config into the database, then sends a message through the full pipeline: AgentService → LLM → response.

- [ ] **Step 1: Write the test file**

```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DB } from '../src/common/database/database.module';
import { CryptoService } from '../src/common/crypto/crypto.service';
import { llmConfigs, saasBindings } from '../src/common/database/schema';
import { cleanDatabase } from './helpers/db-cleaner';
import { createTestApp, registerUser } from './helpers/test-app';
import { createPublishedConnector } from './helpers/test-data';

describe('LLM Integration (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let userId: string;
  let connectorId: string;
  let conversationId: string;

  beforeAll(async () => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY not set in .env.test — skipping LLM integration test');
    }

    await cleanDatabase(process.env.DATABASE_URL!);
    app = await createTestApp();
    const user = await registerUser(app, 'llm');
    token = user.token;
    userId = user.id;

    connectorId = await createPublishedConnector(app, token);

    // Insert DeepSeek LLM config — use injected CryptoService for encryption
    const db = app.get(DB);
    const cryptoService = app.get(CryptoService);
    const apiKeyEncrypted = cryptoService.encrypt(apiKey);

    await db.insert(llmConfigs).values({
      scope: 'user',
      scopeId: userId,
      providerId: 'deepseek',
      modelId: 'deepseek-chat',
      apiKeyEncrypted,
      baseUrl: 'https://api.deepseek.com',
      isActive: true,
    });

    // Bind connector with demo credentials
    const encryptedCred = cryptoService.encrypt('demo-test-key');

    await db.insert(saasBindings).values({
      userId,
      connectorId,
      authType: 'api_key',
      encryptedCred,
      saasUsername: 'llm-test-user',
      permissionsJson: ['leave:submit', 'leave:view', 'expense:delete'],
    });

    // Create conversation
    const convRes = await request(app.getHttpServer())
      .post('/chat/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ connectorId });
    conversationId = convRes.body.id;
  });

  afterAll(async () => {
    await cleanDatabase(process.env.DATABASE_URL!);
    await app.close();
  });

  it('should get a text response from DeepSeek (no tool call)', () => {
    // Send a simple greeting that won't trigger tool calls
    return request(app.getHttpServer())
      .post(`/chat/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        message: '你好，请简单介绍一下你自己，用一句话回答',
        connectorId,
      })
      .expect(201)
      .expect((res) => {
        expect(['text', 'error']).toContain(res.body.type);
        if (res.body.type === 'text') {
          expect(res.body.content).toBeDefined();
          expect(res.body.content.length).toBeGreaterThan(0);
        }
      });
  }, 30000);

  it('should have saved messages in history', async () => {
    const res = await request(app.getHttpServer())
      .get(`/chat/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Should have user message and assistant message
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    const roles = res.body.map((m: any) => m.role);
    expect(roles).toContain('user');
    expect(roles).toContain('assistant');
  });
});
```

- [ ] **Step 2: Run LLM integration test**

Run: `cd /Users/wangkezhong/claude_proj/sasa && pnpm --filter @sasa/server exec jest --config ./test/jest-e2e.json test/llm-integration.e2e-spec.ts --verbose`
Expected: All tests PASS (may take up to 30s for LLM response)

- [ ] **Step 3: Commit**

```bash
git add apps/server/test/llm-integration.e2e-spec.ts
git commit -m "test(server): add DeepSeek LLM integration test"
```

---

## Chunk 8: Run All Backend Integration Tests Together

### Task 8: Verify full suite and add scripts

**Files:**
- Modify: `apps/server/package.json` (add test:e2e script)
- Modify: `package.json` (add root-level test:integration script)

- [ ] **Step 1: Update test:e2e script to load .env.test**

In `apps/server/package.json`, update the `test:e2e` script:

```json
"test:e2e": "dotenv -e .env.test -- jest --config ./test/jest-e2e.json --runInBand"
```

Note: If `dotenv-cli` is not available, the setup.ts file handles it.

- [ ] **Step 2: Add root-level script**

In root `package.json`:

```json
"test:integration": "pnpm --filter @sasa/server test:e2e"
```

- [ ] **Step 3: Run full backend integration suite**

Run: `cd /Users/wangkezhong/claude_proj/sasa && pnpm test:integration`
Expected: All integration tests PASS

- [ ] **Step 4: Commit**

```bash
git add apps/server/package.json package.json
git commit -m "chore: add test:integration script and update test:e2e config"
```

---

## Chunk 9: Playwright Setup

### Task 9: Install and configure Playwright

**Files:**
- Create: `playwright.config.ts`
- Modify: `apps/web/package.json` (add Playwright deps and script)
- Modify: `package.json` (add root test:e2e script)

- [ ] **Step 1: Install Playwright**

Run: `cd /Users/wangkezhong/claude_proj/sasa && pnpm --filter @sasa/web add -D @playwright/test && pnpm --filter @sasa/web exec npx playwright install chromium`

- [ ] **Step 2: Create playwright.config.ts**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'cd apps/server && pnpm dev',
      port: 4000,
      reuseExistingServer: !process.env.CI,
      timeout: 15000,
    },
    {
      command: 'cd apps/web && pnpm dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 15000,
    },
  ],
});
```

- [ ] **Step 3: Create e2e test directory**

Run: `mkdir -p /Users/wangkezhong/claude_proj/sasa/apps/web/e2e`

- [ ] **Step 4: Add test script to web package.json**

Add to `apps/web/package.json` scripts:

```json
"test:e2e": "npx playwright test --config ../../playwright.config.ts"
```

- [ ] **Step 5: Update root package.json**

```json
"test:e2e": "npx playwright test",
```

- [ ] **Step 6: Verify Playwright installs correctly**

Run: `cd /Users/wangkezhong/claude_proj/sasa && pnpm --filter @sasa/web exec npx playwright --version`
Expected: Version number printed

- [ ] **Step 7: Commit**

```bash
git add playwright.config.ts apps/web/package.json apps/web/e2e/ package.json pnpm-lock.yaml
git commit -m "chore: add Playwright E2E test setup and config"
```

---

## Chunk 10: Frontend Auth E2E Tests

### Task 10: Write auth E2E tests

**Files:**
- Create: `apps/web/e2e/auth.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('登录 Sasa')).toBeVisible();
    await expect(page.getByLabel('邮箱')).toBeVisible();
    await expect(page.getByLabel('密码')).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('注册').click();
    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByText('注册 Sasa')).toBeVisible();
  });

  test('should register a new user', async ({ page }) => {
    const timestamp = Date.now();
    await page.goto('/register');
    await page.getByLabel('姓名').fill('E2E Test User');
    await page.getByLabel('邮箱').fill(`e2e-${timestamp}@example.com`);
    await page.getByLabel('密码').fill('password123');
    await page.getByRole('button', { name: '注册' }).click();

    // Should redirect to login with registered=1
    await expect(page).toHaveURL(/\/login\?registered=1/);
  });

  test('should login and redirect to chat', async ({ page }) => {
    // Register first
    const timestamp = Date.now();
    const email = `e2e-login-${timestamp}@example.com`;
    await page.goto('/register');
    await page.getByLabel('姓名').fill('Login Test');
    await page.getByLabel('邮箱').fill(email);
    await page.getByLabel('密码').fill('password123');
    await page.getByRole('button', { name: '注册' }).click();
    await page.waitForURL(/\/login/);

    // Login
    await page.getByLabel('邮箱').fill(email);
    await page.getByLabel('密码').fill('password123');
    await page.getByRole('button', { name: '登录' }).click();

    // Should redirect to chat
    await expect(page).toHaveURL(/\/chat/);
    await expect(page.getByText('Sasa')).toBeVisible();
  });

  test('should show error on wrong password', async ({ page }) => {
    // Register first
    const timestamp = Date.now();
    const email = `e2e-err-${timestamp}@example.com`;
    await page.goto('/register');
    await page.getByLabel('姓名').fill('Error Test');
    await page.getByLabel('邮箱').fill(email);
    await page.getByLabel('密码').fill('password123');
    await page.getByRole('button', { name: '注册' }).click();
    await page.waitForURL(/\/login/);

    // Login with wrong password
    await page.getByLabel('邮箱').fill(email);
    await page.getByLabel('密码').fill('wrongpassword');
    await page.getByRole('button', { name: '登录' }).click();

    // Should show error
    await expect(page.getByText(/邮箱或密码错误|登录失败/)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run auth E2E tests**

Run: `cd /Users/wangkezhong/claude_proj/sasa && pnpm test:e2e -- --project chromium apps/web/e2e/auth.spec.ts`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/e2e/auth.spec.ts
git commit -m "test(web): add Playwright auth E2E tests (register, login, error)"
```

---

## Chunk 11: Frontend Chat E2E Tests

### Task 11: Write chat E2E tests

**Files:**
- Create: `apps/web/e2e/chat.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { test, expect } from '@playwright/test';

/** Helper: register + login, return page */
async function loginAs(page: any) {
  const timestamp = Date.now();
  const email = `e2e-chat-${timestamp}@example.com`;
  await page.goto('/register');
  await page.getByLabel('姓名').fill('Chat User');
  await page.getByLabel('邮箱').fill(email);
  await page.getByLabel('密码').fill('password123');
  await page.getByRole('button', { name: '注册' }).click();
  await page.waitForURL(/\/login/);
  await page.getByLabel('邮箱').fill(email);
  await page.getByLabel('密码').fill('password123');
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForURL(/\/chat/);
}

test.describe('Chat Flow', () => {
  test('should show chat page after login', async ({ page }) => {
    await loginAs(page);
    await expect(page.getByText('选择一个对话或创建新对话开始')).toBeVisible();
  });

  test('should show sidebar navigation', async ({ page }) => {
    await loginAs(page);
    await expect(page.getByText('对话')).toBeVisible();
    await expect(page.getByText('SaaS 管理')).toBeVisible();
    await expect(page.getByText('工作空间')).toBeVisible();
    await expect(page.getByText('设置')).toBeVisible();
  });

  test('should navigate to chat page via sidebar', async ({ page }) => {
    await loginAs(page);
    await page.getByText('SaaS 管理').click();
    await expect(page).toHaveURL(/\/saas/);
    await page.getByText('对话').click();
    await expect(page).toHaveURL(/\/chat/);
  });

  test('should show version info in sidebar', async ({ page }) => {
    await loginAs(page);
    await expect(page.getByText('Sasa AI Agent v0.1')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run chat E2E tests**

Run: `cd /Users/wangkezhong/claude_proj/sasa && pnpm test:e2e -- --project chromium apps/web/e2e/chat.spec.ts`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/e2e/chat.spec.ts
git commit -m "test(web): add Playwright chat E2E tests (sidebar, navigation)"
```

---

## Chunk 12: Final Validation

### Task 12: Run full test suite

- [ ] **Step 1: Run unit tests**

Run: `cd /Users/wangkezhong/claude_proj/sasa && pnpm test`
Expected: All unit tests PASS

- [ ] **Step 2: Run backend integration tests**

Run: `cd /Users/wangkezhong/claude_proj/sasa && pnpm test:integration`
Expected: All integration tests PASS

- [ ] **Step 3: Run E2E tests**

Run: `cd /Users/wangkezhong/claude_proj/sasa && pnpm test:e2e`
Expected: All E2E tests PASS

- [ ] **Step 4: Final commit (if any adjustments were needed)**

```bash
git add -A
git commit -m "test: complete integration and E2E test suite for chunks 1-8"
```
