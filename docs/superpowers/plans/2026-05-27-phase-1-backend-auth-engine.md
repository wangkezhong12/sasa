# Phase 1: Backend Auth Engine

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the multi-auth strategy engine on the backend — shared types, 4 auth strategies, CredentialManager with auto-refresh, and integration into agent/permission services.

**Architecture:** AuthStrategy pattern in connector SDK, server-side CredentialManager wraps decryption/refresh/header construction. Connectors receive pre-built auth headers, never raw credentials.

**Tech Stack:** TypeScript, NestJS 11, Drizzle ORM, Redis, Vitest (SDK), Jest (server)

**Spec:** `docs/superpowers/specs/2026-05-27-multi-auth-strategy-design.md`

**Validation Gate (must pass before git commit):**
1. All unit tests pass (`pnpm test`)
2. Integration tests pass (`pnpm --filter @sasa/server exec jest --no-coverage`)
3. E2E test for auth strategy flow passes
4. Code review via `superpowers:requesting-code-review`
5. Build succeeds (`pnpm build`)

---

## Chunk 1: Foundation — Shared Types + Connector SDK Interface

### Task 1: Add AuthType, AuthStrategyConfig, CredentialPayload to shared package

**Files:**
- Create: `packages/shared/src/types/auth.ts`
- Modify: `packages/shared/src/types/index.ts`

- [ ] **Step 1: Write the type definitions**

Create `packages/shared/src/types/auth.ts`:

```typescript
export type AuthType = 'api_key' | 'app_secret' | 'basic_auth' | 'oauth2_code';

export interface AuthStrategyConfig {
  type: AuthType;
  params: Record<string, string>;
}

export type CredentialPayload =
  | { type: 'api_key'; apiKey: string }
  | { type: 'app_secret'; appId: string; appSecret: string; accessToken?: string; expiresAt?: number }
  | { type: 'basic_auth'; username: string; password: string }
  | { type: 'oauth2_code'; accessToken: string; refreshToken?: string; expiresAt?: number; clientId?: string; clientSecret?: string };
```

- [ ] **Step 2: Export from types barrel**

In `packages/shared/src/types/index.ts`, add: `export * from './auth';`

- [ ] **Step 3: Build and verify**

Run: `pnpm --filter @sasa/shared build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types/auth.ts packages/shared/src/types/index.ts
git commit -m "feat(shared): add AuthType, AuthStrategyConfig, CredentialPayload types"
```

---

### Task 2: Add AuthStrategy interface to connector SDK

**Files:**
- Create: `packages/connector-sdk/src/auth-strategy.ts`
- Modify: `packages/connector-sdk/src/index.ts`

- [ ] **Step 1: Write the interface**

Create `packages/connector-sdk/src/auth-strategy.ts` — imports `AuthStrategyConfig` from `@sasa/shared`, defines `FormField`, `AuthStrategy` interfaces. `buildAuthHeaders` accepts optional `config` param for BasicAuthStrategy cookie mode.

- [ ] **Step 2: Export from SDK barrel**

Add `export * from './auth-strategy';` to `packages/connector-sdk/src/index.ts`

- [ ] **Step 3: Build and verify**

Run: `pnpm --filter @sasa/connector-sdk build`

- [ ] **Step 4: Commit**

```bash
git add packages/connector-sdk/src/auth-strategy.ts packages/connector-sdk/src/index.ts
git commit -m "feat(connector-sdk): add AuthStrategy interface and FormField types"
```

---

### Task 3: Update SaaSConnector interface + BaseRestConnector + DemoConnector (atomic)

**Files:**
- Modify: `packages/shared/src/types/connector.ts`
- Modify: `packages/connector-sdk/src/base-connector.ts`
- Modify: `packages/connector-sdk/src/base-connector.spec.ts`
- Modify: `apps/server/src/modules/connector/connectors/demo/index.ts`
- Modify: `apps/server/src/modules/connector/connectors/demo/index.spec.ts`

All changes in a single commit to keep the build green.

- [ ] **Step 1: Update SaaSConnector interface** — remove `validateCredentials`, `fetchPermissions`, change `executeToolCall` to accept `authHeaders: Record<string, string>`, add `getAuthStrategyConfig(authType)`

- [ ] **Step 2: Update BaseRestConnector** — implement new interface, remove private `buildAuthHeaders`, add abstract `getAuthStrategyConfig`

- [ ] **Step 3: Update BaseRestConnector tests** — change all `executeToolCall('tool', params, 'key')` to `executeToolCall('tool', params, { Authorization: 'Bearer key' })`, add `getAuthStrategyConfig` to `TestConnector`

- [ ] **Step 4: Update DemoConnector** — add `getAuthStrategyConfig`, remove `validateCredentials`/`fetchPermissions`

- [ ] **Step 5: Update DemoConnector tests** — fix references to removed methods

- [ ] **Step 6: Build and run all affected tests**

Run:
```bash
pnpm --filter @sasa/shared build
pnpm --filter @sasa/connector-sdk exec vitest run
pnpm --filter @sasa/server exec jest src/modules/connector/ --no-coverage
```

- [ ] **Step 7: Commit (atomic)**

```bash
git add packages/shared/src/types/connector.ts packages/connector-sdk/src/base-connector.ts packages/connector-sdk/src/base-connector.spec.ts apps/server/src/modules/connector/connectors/demo/
git commit -m "feat: update SaaSConnector interface to accept authHeaders, update BaseRestConnector and DemoConnector"
```

---

## Chunk 2: Strategy Implementations

Four independent `AuthStrategy` classes. Can be parallelized.

### Task 4: Implement ApiKeyStrategy

**Files:**
- Create: `packages/connector-sdk/src/strategies/api-key.strategy.ts`
- Create: `packages/connector-sdk/src/strategies/api-key.strategy.spec.ts`

- [ ] **Step 1: Write failing test** — type, formFields, validateAndBuild, buildAuthHeaders, no isExpired/refreshToken
- [ ] **Step 2: Run test, verify fail**
- [ ] **Step 3: Implement** — wraps `apiKey` into Bearer header
- [ ] **Step 4: Run test, verify pass**
- [ ] **Step 5: Commit**

---

### Task 5: Implement AppSecretStrategy

**Files:**
- Create: `packages/connector-sdk/src/strategies/app-secret.strategy.ts`
- Create: `packages/connector-sdk/src/strategies/app-secret.strategy.spec.ts`

- [ ] **Step 1: Write failing test** — type, formFields (appId + appSecret), validateAndBuild calls tokenUrl, buildAuthHeaders with accessToken, isExpired checks expiresAt, refreshToken reuses appId+appSecret
- [ ] **Step 2: Run test, verify fail**
- [ ] **Step 3: Implement** — exchanges appId/appSecret for accessToken, implements isExpired/refreshToken
- [ ] **Step 4: Run test, verify pass**
- [ ] **Step 5: Commit**

---

### Task 6: Implement BasicAuthStrategy

**Files:**
- Create: `packages/connector-sdk/src/strategies/basic-auth.strategy.ts`
- Create: `packages/connector-sdk/src/strategies/basic-auth.strategy.spec.ts`

- [ ] **Step 1: Write failing test** — type, formFields (username + password), validateAndBuild calls loginUrl, buildAuthHeaders with cookie mode vs basic mode, refreshToken re-logs in
- [ ] **Step 2: Run test, verify fail**
- [ ] **Step 3: Implement** — cookie mode returns empty headers (session managed by CredentialManager), basic mode returns `Authorization: Basic base64(user:pass)`
- [ ] **Step 4: Run test, verify pass**
- [ ] **Step 5: Commit**

---

### Task 7: Implement OAuth2CodeStrategy

**Files:**
- Create: `packages/connector-sdk/src/strategies/oauth2-code.strategy.ts`
- Create: `packages/connector-sdk/src/strategies/oauth2-code.strategy.spec.ts`

- [ ] **Step 1: Write failing test** — type, empty formFields (uses redirect), validateAndBuild exchanges code for tokens, buildAuthHeaders with accessToken, isExpired, refreshToken with refresh_token grant
- [ ] **Step 2: Run test, verify fail**
- [ ] **Step 3: Implement** — authorization_code and refresh_token grant types
- [ ] **Step 4: Run test, verify pass**
- [ ] **Step 5: Commit**

---

### Task 8: Export all strategies from SDK barrel

**Files:**
- Modify: `packages/connector-sdk/src/index.ts`

- [ ] **Step 1: Add strategy exports** — ApiKeyStrategy, AppSecretStrategy, BasicAuthStrategy, OAuth2CodeStrategy
- [ ] **Step 2: Build and run all SDK tests**

Run: `pnpm --filter @sasa/connector-sdk build && pnpm --filter @sasa/connector-sdk exec vitest run`

- [ ] **Step 3: Commit**

---

## Chunk 3: Server Credential Engine

### Task 9: Create StrategyResolver

**Files:**
- Create: `apps/server/src/modules/auth/auth-strategy.resolver.ts`
- Create: `apps/server/src/modules/auth/auth-strategy.resolver.spec.ts`

- [ ] **Step 1: Write failing test** — resolves all 4 auth types, throws for unknown
- [ ] **Step 2: Run test, verify fail**
- [ ] **Step 3: Implement** — Map of AuthType → AuthStrategy instances
- [ ] **Step 4: Run test, verify pass**
- [ ] **Step 5: Commit**

---

### Task 10: Create CredentialManager

**Files:**
- Create: `apps/server/src/modules/auth/credential-manager.service.ts`
- Create: `apps/server/src/modules/auth/credential-manager.service.spec.ts`

- [ ] **Step 1: Write failing test** — getValidAuthHeaders for api_key binding, NotFoundException, ForbiddenException for expired, auto-refresh for expired app_secret binding
- [ ] **Step 2: Run test, verify fail**
- [ ] **Step 3: Implement** — decrypt payload, resolve strategy, check expiration, refresh with distributed lock, build headers
- [ ] **Step 4: Run test, verify pass**
- [ ] **Step 5: Commit**

---

### Task 11: Update database schema + DDL migration

**Files:**
- Modify: `apps/server/src/common/database/schema.ts`
- Create: `apps/server/drizzle/migrations/0003_drop_expires_at.sql`

- [ ] **Step 1: Remove expiresAt from saasBindings** in schema.ts
- [ ] **Step 2: Create DDL migration SQL** — `UPDATE auth_type` + `DROP COLUMN expires_at`
- [ ] **Step 3: Fix all references to expiresAt** in server code/tests
- [ ] **Step 4: Run server tests**
- [ ] **Step 5: Commit**

---

### Task 12: Update SaaSBindingService to use strategies

**Files:**
- Modify: `apps/server/src/modules/auth/saas-binding.service.ts`
- Modify: `apps/server/src/modules/auth/saas-binding.service.spec.ts`

- [ ] **Step 1: Update service** — inject StrategyResolver + ConnectorRegistry, use strategy.validateAndBuild, store JSON.stringify(payload)
- [ ] **Step 2: Update tests** — mock strategies, verify JSON payload format
- [ ] **Step 3: Run tests**
- [ ] **Step 4: Commit**

---

### Task 13: Integrate CredentialManager into Agent and Permission services

**Files:**
- Modify: `apps/server/src/modules/agent/agent.service.ts`
- Modify: `apps/server/src/modules/permission/permission.service.ts`
- Modify: `apps/server/src/modules/agent/agent.service.spec.ts`
- Modify: `apps/server/src/modules/permission/permission.service.spec.ts`

- [ ] **Step 1: Update agent.service.ts** — replace direct decrypt with `credentialManager.getValidAuthHeaders()`, pass headers to `connector.executeToolCall()`
- [ ] **Step 2: Update permission.service.ts** — replace `connector.fetchPermissions()` with `CredentialManager.getValidAuthHeaders()` + call `permissionsEndpoint` from connector config
- [ ] **Step 3: Update tests** — mock CredentialManager
- [ ] **Step 4: Run all server tests**
- [ ] **Step 5: Commit**

---

### Task 14: Update AuthModule registration

**Files:**
- Modify: `apps/server/src/modules/auth/auth.module.ts`

- [ ] **Step 1: Register providers** — StrategyResolver, CredentialManager in providers/exports
- [ ] **Step 2: Run server tests**
- [ ] **Step 3: Commit**

---

## Phase 1 Validation Gate

### Task 15: Unit + Integration tests

- [ ] **Step 1: Run all unit tests**

Run: `pnpm test`
Expected: All PASS across shared, connector-sdk, server packages.

- [ ] **Step 2: Run integration tests**

Run: `pnpm --filter @sasa/server exec jest --no-coverage`
Expected: All PASS

- [ ] **Step 3: Run build**

Run: `pnpm build`
Expected: All packages build successfully.

### Task 16: E2E test for auth strategy flow

**Files:**
- Create: `apps/server/test/auth-strategy.e2e-spec.ts`

- [ ] **Step 1: Write E2E test** — bind with api_key → verify payload format → get valid headers; bind with app_secret (mocked) → verify token exchange
- [ ] **Step 2: Run E2E test**

Run: `pnpm --filter @sasa/server exec jest --config ./test/jest-e2e.json --runInBand --forceExit`
Expected: PASS

- [ ] **Step 3: Commit**

### Task 17: Code review

- [ ] **Step 1: Request code review** via `superpowers:requesting-code-review`
- [ ] **Step 2: Fix any review findings**
- [ ] **Step 3: Final commit if needed**

### Task 18: Phase 1 complete — tag commit

- [ ] **Step 1: Tag the commit**

```bash
git tag -a phase-1-backend-auth-engine -m "Phase 1 complete: backend multi-auth strategy engine"
```
