# Integration & E2E Testing Design

## Overview

Integration and E2E testing for Sasa AI Agent chunks 1-8, covering all backend API endpoints and frontend user flows.

## Environment

- **PostgreSQL**: localhost:5432, database `postgres`, schema `sasa`, user `postgres`, password `wkz2023`
- **Redis**: localhost:6379, no password
- **LLM**: DeepSeek API (for chat integration tests), base URL `https://api.deepseek.com`

## 1. Backend Integration Tests

### Infrastructure

- **Framework**: Jest + supertest (already installed)
- **Config**: `apps/server/test/jest-e2e.json` (already exists, pattern `*.e2e-spec.ts`)
- **Real services**: PostgreSQL and Redis (no mocks for data layer)
- **Test data cleanup**: Truncate all tables in `sasa` schema before each test suite

### Test Files

All files under `apps/server/test/`:

#### 1.1 `helpers/test-app.ts`
- Create NestJS test application with real AppModule
- Apply same pipes/guards as production (`ValidationPipe`, CORS)
- Helper: `getAuthToken(userId?)` — sign a valid JWT for authenticated endpoints
- Helper: `createTestUser(app)` — register a user and return { id, email, token }

#### 1.2 `helpers/db-cleaner.ts`
- Connect to PostgreSQL, truncate all tables in `sasa` schema
- Called in `beforeAll` or `afterAll` of each test suite

#### 1.3 `auth.e2e-spec.ts`
- `POST /auth/register` — success, duplicate email, missing fields
- `POST /auth/login` — success (returns JWT), wrong password, non-existent user

#### 1.4 `workspace.e2e-spec.ts`
- `POST /workspaces` — create workspace, returns slug
- `GET /workspaces` — list user workspaces
- `POST /workspaces/:id/members` — add member
- `GET /workspaces/:id/members` — list members
- `DELETE /workspaces/:id/members/:memberId` — remove member
- Auth guard: requests without JWT return 401

#### 1.5 `saas-binding.e2e-spec.ts`
- Requires: user + workspace + published connector
- `POST /saas-bindings` — bind connector with API key credentials
- `GET /saas-bindings` — list user bindings
- `DELETE /saas-bindings/:id` — unbind

#### 1.6 `schema.e2e-spec.ts`
- `POST /schemas/upload` — upload OpenAPI schema, creates connector in draft
- `POST /schemas/connectors/:id/publish` — publish draft connector
- `GET /schemas/connectors` — list connectors
- `GET /schemas/connectors/:id/tools` — list tool definitions
- `PATCH /schemas/tools/:id` — update tool (risk level, permissions)

#### 1.7 `chat.e2e-spec.ts`
- Requires: user + workspace + published connector + binding
- `POST /chat/conversations` — create conversation
- `GET /chat/conversations` — list user conversations
- `POST /chat/conversations/:id/messages` — send message (mock LLM for basic tests)
- `GET /chat/conversations/:id/messages` — get history
- `POST /chat/confirm` — confirm tool call
- `GET /chat/stream/:clientId` — SSE connection (token in query param)
- Ownership: user cannot access another user's conversation

### Test Data Flow

```
register user → get JWT → create workspace → upload schema → publish connector
  → bind connector → create conversation → send message → confirm tool → get history
```

Each test suite creates its own test data and cleans up after.

### LLM Handling in Chat Tests

- For `chat.e2e-spec.ts` basic tests (conversation CRUD, history): mock AgentService
- For LLM integration test: one dedicated test case using DeepSeek API to verify end-to-end message processing

## 2. Frontend E2E Tests

### Infrastructure

- **Framework**: Playwright
- **Config**: `playwright.config.ts` at project root
- **Servers**: Start both NestJS (port 4000) and Next.js (port 3000) before tests
- **Test location**: `apps/web/e2e/`

### Test Files

#### 2.1 `apps/web/e2e/auth.spec.ts`
- Visit `/login` — see login form
- Register new user — fill form, submit, redirect to chat
- Login existing user — fill form, submit, redirect to chat
- Login with wrong password — see error message
- Logout — redirect to login page

#### 2.2 `apps/web/e2e/chat.spec.ts`
- After login, see chat interface
- Sidebar shows conversations
- Create new conversation
- Type and send a message (mock SSE response)

## 3. Environment Configuration

### `.env.test` (for backend integration tests)

```
DATABASE_URL=postgresql://postgres:wkz2023@localhost:5432/postgres
REDIS_URL=redis://localhost:6379
ENCRYPTION_KEY=<generated-for-test>
NEXTAUTH_SECRET=<generated-for-test>
NEXTAUTH_URL=http://localhost:3000
SERVER_PORT=4000
```

### Playwright config

- `baseURL`: `http://localhost:3000`
- `webServer`: start both server and web dev servers
- `timeout`: 30s
- Browsers: chromium only

## 4. Test Scripts

Add to root `package.json`:

```json
{
  "test:integration": "pnpm --filter @sasa/server test:e2e",
  "test:e2e": "pnpm --filter @sasa/web exec playwright test",
  "test:all": "pnpm test && pnpm test:integration && pnpm test:e2e"
}
```

## 5. Implementation Order

1. Create test infrastructure (helpers, config, .env.test)
2. Auth integration tests
3. Workspace integration tests
4. Schema integration tests
5. SaaS binding integration tests
6. Chat integration tests
7. Playwright setup + auth E2E
8. Chat E2E tests
