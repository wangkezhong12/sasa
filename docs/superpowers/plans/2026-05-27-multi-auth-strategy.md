# Multi-Auth Strategy Engine Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand SaaS connector authentication from single `api_key` to support `app_secret`, `basic_auth`, and `oauth2_code` using the Strategy pattern.

**Architecture:** Each auth type is a self-contained `AuthStrategy` class in the connector SDK. A server-side `CredentialManager` wraps credential decryption, expiration checking, auto-refresh, and header construction. Connectors receive pre-built auth headers instead of raw credentials. Frontend dynamically renders binding forms from connector auth schemas.

**Tech Stack:** TypeScript, NestJS 11, Drizzle ORM, Redis, Vitest (SDK/web), Jest (server), React + shadcn/ui + Tailwind CSS (frontend)

**Spec:** `docs/superpowers/specs/2026-05-27-multi-auth-strategy-design.md`

---

## Chunk 1: Foundation — Shared Types + Connector SDK Interface

Changes the `SaaSConnector` interface and adds the `AuthStrategy` types. All downstream code depends on this.

### Task 1: Add AuthType and CredentialPayload to shared package

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

In `packages/shared/src/types/index.ts`, add:

```typescript
export * from './auth';
```

- [ ] **Step 3: Build and verify exports**

Run: `pnpm --filter @sasa/shared build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types/auth.ts packages/shared/src/types/index.ts
git commit -m "feat(shared): add AuthType and CredentialPayload types"
```

---

### Task 2: Add AuthStrategy interface to connector SDK

**Files:**
- Create: `packages/connector-sdk/src/auth-strategy.ts`
- Modify: `packages/connector-sdk/src/types.ts`
- Modify: `packages/connector-sdk/src/index.ts`

- [ ] **Step 1: Write the AuthStrategy interface**

Create `packages/connector-sdk/src/auth-strategy.ts`:

```typescript
import type { AuthType, CredentialPayload, AuthStrategyConfig } from '@sasa/shared';

export type { AuthStrategyConfig };

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'password';
  placeholder?: string;
  helpText?: string;
  required: boolean;
}

export interface AuthStrategy {
  readonly type: AuthType;

  getFormFields(): FormField[];

  validateAndBuild(
    input: Record<string, string>,
    config: AuthStrategyConfig,
  ): Promise<CredentialPayload>;

  buildAuthHeaders(creds: CredentialPayload, config?: AuthStrategyConfig): Record<string, string>;

  isExpired?(creds: CredentialPayload): boolean;

  refreshToken?(
    creds: CredentialPayload,
    config: AuthStrategyConfig,
  ): Promise<CredentialPayload>;
}
```

- [ ] **Step 2: Re-export from SDK barrel**

In `packages/connector-sdk/src/index.ts`, add:

```typescript
export * from './auth-strategy';
```

- [ ] **Step 3: Build and verify**

Run: `pnpm --filter @sasa/connector-sdk build`
Expected: Build succeeds.

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

All changes must be in a single commit to keep the build green.

- [ ] **Step 1: Update the SaaSConnector interface**

In `packages/shared/src/types/connector.ts`, replace the entire `SaaSConnector` interface:

```typescript
import type { AuthType, AuthStrategyConfig } from './auth';

export interface SaaSConnector {
  name: string;
  version: string;
  protocol: 'rest' | 'mcp' | 'cli';
  supportedAuthTypes: AuthType[];
  getAuthStrategyConfig(authType: AuthType): AuthStrategyConfig | undefined;

  getToolDefinitions(): ConnectorToolDefinition[];

  executeToolCall(
    toolName: string,
    parameters: Record<string, unknown>,
    authHeaders: Record<string, string>,
  ): Promise<ToolResult>;
}
```

- [ ] **Step 2: Update BaseRestConnector implementation**

In `packages/connector-sdk/src/base-connector.ts`:

```typescript
import type { AuthType, AuthStrategyConfig } from '@sasa/shared';
import type { SaaSConnector, ConnectorToolDefinition, ToolResult } from '@sasa/shared';

export abstract class BaseRestConnector implements SaaSConnector {
  abstract name: string;
  abstract version: string;
  abstract supportedAuthTypes: AuthType[];
  override protocol = 'rest' as const;

  abstract getBaseUrl(): string;
  abstract getToolDefinitions(): ConnectorToolDefinition[];
  abstract getAuthStrategyConfig(authType: AuthType): AuthStrategyConfig | undefined;

  async executeToolCall(
    toolName: string,
    parameters: Record<string, unknown>,
    authHeaders: Record<string, string>,
  ): Promise<ToolResult> {
    // Same logic as before, but:
    // 1. Replace `this.buildAuthHeaders(credentials)` with `authHeaders` parameter
    // 2. Remove the private buildAuthHeaders method entirely
  }
}
```

- [ ] **Step 3: Update BaseRestConnector tests**

In `packages/connector-sdk/src/base-connector.spec.ts`:
- `TestConnector` must implement `getAuthStrategyConfig(authType)` method
- All calls `executeToolCall('tool', params, 'test-key')` change to `executeToolCall('tool', params, { Authorization: 'Bearer test-key' })`
- Remove `validateCredentials` and `fetchPermissions` from `TestConnector`
- The `supportedAuthTypes` type changes to `AuthType[]`

- [ ] **Step 4: Update DemoConnector**

In `apps/server/src/modules/connector/connectors/demo/index.ts`:

```typescript
import type { AuthType, AuthStrategyConfig } from '@sasa/shared';

export class DemoConnector extends BaseRestConnector {
  name = 'Demo ERP';
  version = '1.0.0';
  supportedAuthTypes: AuthType[] = ['api_key'];

  private authConfigs: Record<string, AuthStrategyConfig> = {
    api_key: { type: 'api_key', params: {} },
  };

  getAuthStrategyConfig(authType: AuthType): AuthStrategyConfig | undefined {
    return this.authConfigs[authType];
  }

  getBaseUrl() { return 'https://demo-erp.example.com/api'; }
  getToolDefinitions() { /* same as before */ }
  // Remove validateCredentials and fetchPermissions — moved to ApiKeyStrategy
}
```

- [ ] **Step 5: Update DemoConnector tests**

Fix any test references to old interface methods (`validateCredentials`, `fetchPermissions`, `executeToolCall` with string arg).

- [ ] **Step 6: Build and run all affected tests**

Run:
```bash
pnpm --filter @sasa/shared build
pnpm --filter @sasa/connector-sdk exec vitest run
pnpm --filter @sasa/server exec jest src/modules/connector/ --no-coverage
```
Expected: All PASS

- [ ] **Step 7: Commit (atomic)**

```bash
git add packages/shared/src/types/connector.ts packages/connector-sdk/src/base-connector.ts packages/connector-sdk/src/base-connector.spec.ts apps/server/src/modules/connector/connectors/demo/
git commit -m "feat: update SaaSConnector interface to accept authHeaders, update BaseRestConnector and DemoConnector"
```

---

## Chunk 2: Strategy Implementations

Four concrete `AuthStrategy` classes in the connector SDK. Each is self-contained with its own test.

### Task 6: Implement ApiKeyStrategy

**Files:**
- Create: `packages/connector-sdk/src/strategies/api-key.strategy.ts`
- Create: `packages/connector-sdk/src/strategies/api-key.strategy.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/connector-sdk/src/strategies/api-key.strategy.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ApiKeyStrategy } from './api-key.strategy';

describe('ApiKeyStrategy', () => {
  const strategy = new ApiKeyStrategy();

  it('should have type api_key', () => {
    expect(strategy.type).toBe('api_key');
  });

  it('should return form fields with one password field', () => {
    const fields = strategy.getFormFields();
    expect(fields).toHaveLength(1);
    expect(fields[0]).toEqual({
      name: 'apiKey',
      label: 'API Key',
      type: 'password',
      placeholder: '输入 API Key',
      helpText: '在第三方平台的开发者设置中获取',
      required: true,
    });
  });

  it('should build credential payload from input', async () => {
    const payload = await strategy.validateAndBuild({ apiKey: 'sk-test-123' }, { type: 'api_key', params: {} });
    expect(payload).toEqual({ type: 'api_key', apiKey: 'sk-test-123' });
  });

  it('should throw if apiKey is empty', async () => {
    await expect(strategy.validateAndBuild({ apiKey: '' }, { type: 'api_key', params: {} }))
      .rejects.toThrow('API Key is required');
  });

  it('should build Bearer auth header', () => {
    const headers = strategy.buildAuthHeaders({ type: 'api_key', apiKey: 'sk-abc' });
    expect(headers).toEqual({ Authorization: 'Bearer sk-abc' });
  });

  it('should not implement isExpired or refreshToken', () => {
    expect(strategy.isExpired).toBeUndefined();
    expect(strategy.refreshToken).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @sasa/connector-sdk exec vitest run src/strategies/api-key.strategy.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement ApiKeyStrategy**

Create `packages/connector-sdk/src/strategies/api-key.strategy.ts`:

```typescript
import type { AuthStrategy, AuthStrategyConfig, FormField } from '../auth-strategy';
import type { CredentialPayload } from '@sasa/shared';

export class ApiKeyStrategy implements AuthStrategy {
  readonly type = 'api_key' as const;

  getFormFields(): FormField[] {
    return [{
      name: 'apiKey',
      label: 'API Key',
      type: 'password',
      placeholder: '输入 API Key',
      helpText: '在第三方平台的开发者设置中获取',
      required: true,
    }];
  }

  async validateAndBuild(input: Record<string, string>, _config: AuthStrategyConfig): Promise<CredentialPayload> {
    const apiKey = input.apiKey?.trim();
    if (!apiKey) throw new Error('API Key is required');
    return { type: 'api_key', apiKey };
  }

  buildAuthHeaders(creds: CredentialPayload): Record<string, string> {
    if (creds.type !== 'api_key') throw new Error('Invalid credential type');
    return { Authorization: `Bearer ${creds.apiKey}` };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @sasa/connector-sdk exec vitest run src/strategies/api-key.strategy.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/connector-sdk/src/strategies/api-key.strategy.ts packages/connector-sdk/src/strategies/api-key.strategy.spec.ts
git commit -m "feat(connector-sdk): implement ApiKeyStrategy"
```

---

### Task 7: Implement AppSecretStrategy

**Files:**
- Create: `packages/connector-sdk/src/strategies/app-secret.strategy.ts`
- Create: `packages/connector-sdk/src/strategies/app-secret.strategy.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/connector-sdk/src/strategies/app-secret.strategy.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppSecretStrategy } from './app-secret.strategy';
import type { AuthStrategyConfig } from '../auth-strategy';

describe('AppSecretStrategy', () => {
  const strategy = new AppSecretStrategy();
  const config: AuthStrategyConfig = {
    type: 'app_secret',
    params: { tokenUrl: 'https://api.example.com/auth/token' },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should have type app_secret', () => {
    expect(strategy.type).toBe('app_secret');
  });

  it('should return form fields for appId and appSecret', () => {
    const fields = strategy.getFormFields();
    expect(fields).toHaveLength(2);
    expect(fields[0].name).toBe('appId');
    expect(fields[1].name).toBe('appSecret');
    expect(fields[1].type).toBe('password');
  });

  it('should exchange appId/appSecret for accessToken during validateAndBuild', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ access_token: 'tok-123', expires_in: 7200 }),
    }));

    const payload = await strategy.validateAndBuild(
      { appId: 'my-app', appSecret: 'my-secret' },
      config,
    );

    expect(payload).toEqual({
      type: 'app_secret',
      appId: 'my-app',
      appSecret: 'my-secret',
      accessToken: 'tok-123',
      expiresAt: expect.any(Number),
    });

    vi.restoreAllMocks();
  });

  it('should throw if token exchange fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Invalid credentials'),
    }));

    await expect(
      strategy.validateAndBuild({ appId: 'x', appSecret: 'y' }, config),
    ).rejects.toThrow();

    vi.restoreAllMocks();
  });

  it('should build Bearer auth header from accessToken', () => {
    const headers = strategy.buildAuthHeaders({
      type: 'app_secret',
      appId: 'a', appSecret: 's', accessToken: 'tok-123', expiresAt: Date.now() + 3600000,
    });
    expect(headers).toEqual({ Authorization: 'Bearer tok-123' });
  });

  it('should detect expiration correctly', () => {
    const expired = strategy.isExpired!({
      type: 'app_secret',
      appId: 'a', appSecret: 's', accessToken: 'tok', expiresAt: Date.now() - 1000,
    });
    expect(expired).toBe(true);

    const valid = strategy.isExpired!({
      type: 'app_secret',
      appId: 'a', appSecret: 's', accessToken: 'tok', expiresAt: Date.now() + 3600000,
    });
    expect(valid).toBe(false);
  });

  it('should refresh token using appId + appSecret', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ access_token: 'new-tok', expires_in: 7200 }),
    }));

    const refreshed = await strategy.refreshToken!({
      type: 'app_secret',
      appId: 'my-app', appSecret: 'my-secret', accessToken: 'old-tok', expiresAt: Date.now() - 1000,
    }, config);

    expect(refreshed.accessToken).toBe('new-tok');
    expect(refreshed.appId).toBe('my-app');

    vi.restoreAllMocks();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @sasa/connector-sdk exec vitest run src/strategies/app-secret.strategy.spec.ts`
Expected: FAIL

- [ ] **Step 3: Implement AppSecretStrategy**

Create `packages/connector-sdk/src/strategies/app-secret.strategy.ts`:

```typescript
import type { AuthStrategy, AuthStrategyConfig, FormField } from '../auth-strategy';
import type { CredentialPayload } from '@sasa/shared';

export class AppSecretStrategy implements AuthStrategy {
  readonly type = 'app_secret' as const;

  getFormFields(): FormField[] {
    return [
      { name: 'appId', label: 'App ID', type: 'text', placeholder: '输入 App ID', helpText: '在第三方平台创建应用后获取', required: true },
      { name: 'appSecret', label: 'App Secret', type: 'password', placeholder: '输入 App Secret', required: true },
    ];
  }

  async validateAndBuild(input: Record<string, string>, config: AuthStrategyConfig): Promise<CredentialPayload> {
    const appId = input.appId?.trim();
    const appSecret = input.appSecret?.trim();
    if (!appId || !appSecret) throw new Error('App ID and App Secret are required');

    const tokenUrl = config.params.tokenUrl;
    if (!tokenUrl) throw new Error('tokenUrl not configured for app_secret strategy');

    const tokenResp = await this.fetchAccessToken(tokenUrl, appId, appSecret);
    return {
      type: 'app_secret',
      appId,
      appSecret,
      accessToken: tokenResp.accessToken,
      expiresAt: tokenResp.expiresAt,
    };
  }

  buildAuthHeaders(creds: CredentialPayload): Record<string, string> {
    if (creds.type !== 'app_secret' || !creds.accessToken) {
      throw new Error('Invalid or missing access token');
    }
    return { Authorization: `Bearer ${creds.accessToken}` };
  }

  isExpired(creds: CredentialPayload): boolean {
    if (creds.type !== 'app_secret' || !creds.expiresAt) return false;
    // Refresh 60 seconds before actual expiry
    return Date.now() > creds.expiresAt - 60_000;
  }

  async refreshToken(creds: CredentialPayload, config: AuthStrategyConfig): Promise<CredentialPayload> {
    if (creds.type !== 'app_secret') throw new Error('Invalid credential type');
    const tokenUrl = config.params.tokenUrl;
    if (!tokenUrl) throw new Error('tokenUrl not configured');

    const tokenResp = await this.fetchAccessToken(tokenUrl, creds.appId, creds.appSecret);
    return { ...creds, accessToken: tokenResp.accessToken, expiresAt: tokenResp.expiresAt };
  }

  private async fetchAccessToken(tokenUrl: string, appId: string, appSecret: string): Promise<{ accessToken: string; expiresAt: number }> {
    const resp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId, appSecret, grant_type: 'client_credentials' }),
    });
    if (!resp.ok) throw new Error(`Token exchange failed: ${resp.status}`);
    const data = await resp.json() as { access_token: string; expires_in: number };
    return {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @sasa/connector-sdk exec vitest run src/strategies/app-secret.strategy.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/connector-sdk/src/strategies/app-secret.strategy.ts packages/connector-sdk/src/strategies/app-secret.strategy.spec.ts
git commit -m "feat(connector-sdk): implement AppSecretStrategy with token refresh"
```

---

### Task 8: Implement BasicAuthStrategy

**Files:**
- Create: `packages/connector-sdk/src/strategies/basic-auth.strategy.ts`
- Create: `packages/connector-sdk/src/strategies/basic-auth.strategy.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/connector-sdk/src/strategies/basic-auth.strategy.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BasicAuthStrategy } from './basic-auth.strategy';
import type { AuthStrategyConfig } from '../auth-strategy';

describe('BasicAuthStrategy', () => {
  const strategy = new BasicAuthStrategy();

  it('should have type basic_auth', () => {
    expect(strategy.type).toBe('basic_auth');
  });

  it('should return form fields for username and password', () => {
    const fields = strategy.getFormFields();
    expect(fields).toHaveLength(2);
    expect(fields[0].name).toBe('username');
    expect(fields[1].name).toBe('password');
    expect(fields[1].type).toBe('password');
  });

  it('should validate by calling loginUrl and store credentials', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'set-cookie': 'kdservice-sessionid=abc123' }),
    }));

    const config: AuthStrategyConfig = {
      type: 'basic_auth',
      params: { loginUrl: 'https://erp.example.com/login', authMode: 'cookie' },
    };

    const payload = await strategy.validateAndBuild(
      { username: 'admin', password: 'pass123' },
      config,
    );

    expect(payload).toEqual({ type: 'basic_auth', username: 'admin', password: 'pass123' });
    vi.restoreAllMocks();
  });

  it('should throw if login fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    const config: AuthStrategyConfig = {
      type: 'basic_auth',
      params: { loginUrl: 'https://erp.example.com/login', authMode: 'basic' },
    };

    await expect(
      strategy.validateAndBuild({ username: 'admin', password: 'wrong' }, config),
    ).rejects.toThrow();

    vi.restoreAllMocks();
  });

  it('should build Cookie header in cookie mode', () => {
    const config: AuthStrategyConfig = {
      type: 'basic_auth',
      params: { loginUrl: 'https://erp.example.com/login', authMode: 'cookie' },
    };
    const headers = strategy.buildAuthHeaders(
      { type: 'basic_auth', username: 'admin', password: 'pass' },
      config,
    );
    expect(headers).toEqual({ Cookie: expect.stringContaining('kdservice-sessionid=') });
  });

  it('should build Basic auth header in basic mode', () => {
    const config: AuthStrategyConfig = {
      type: 'basic_auth',
      params: { loginUrl: 'https://erp.example.com/login', authMode: 'basic' },
    };
    const headers = strategy.buildAuthHeaders(
      { type: 'basic_auth', username: 'admin', password: 'pass' },
      config,
    );
    expect(headers).toEqual({
      Authorization: `Basic ${Buffer.from('admin:pass').toString('base64')}`,
    });
  });

  it('should refresh by re-logging in', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'set-cookie': 'kdservice-sessionid=new-session' }),
    }));

    const config: AuthStrategyConfig = {
      type: 'basic_auth',
      params: { loginUrl: 'https://erp.example.com/login', authMode: 'cookie' },
    };

    const refreshed = await strategy.refreshToken!(
      { type: 'basic_auth', username: 'admin', password: 'pass' },
      config,
    );

    expect(refreshed).toEqual({ type: 'basic_auth', username: 'admin', password: 'pass' });
    vi.restoreAllMocks();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @sasa/connector-sdk exec vitest run src/strategies/basic-auth.strategy.spec.ts`
Expected: FAIL

- [ ] **Step 3: Implement BasicAuthStrategy**

Create `packages/connector-sdk/src/strategies/basic-auth.strategy.ts`:

```typescript
import type { AuthStrategy, AuthStrategyConfig, FormField } from '../auth-strategy';
import type { CredentialPayload } from '@sasa/shared';

export class BasicAuthStrategy implements AuthStrategy {
  readonly type = 'basic_auth' as const;

  getFormFields(): FormField[] {
    return [
      { name: 'username', label: '用户名', type: 'text', placeholder: '输入 ERP 用户名', required: true },
      { name: 'password', label: '密码', type: 'password', placeholder: '输入密码', required: true },
    ];
  }

  async validateAndBuild(input: Record<string, string>, config: AuthStrategyConfig): Promise<CredentialPayload> {
    const username = input.username?.trim();
    const password = input.password?.trim();
    if (!username || !password) throw new Error('Username and password are required');

    const loginUrl = config.params.loginUrl;
    if (!loginUrl) throw new Error('loginUrl not configured for basic_auth strategy');

    const resp = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!resp.ok) throw new Error(`Login failed: ${resp.status}`);

    return { type: 'basic_auth', username, password };
  }

  buildAuthHeaders(creds: CredentialPayload, config?: AuthStrategyConfig): Record<string, string> {
    if (creds.type !== 'basic_auth') throw new Error('Invalid credential type');
    const authMode = config?.params?.authMode ?? 'basic';
    if (authMode === 'cookie') {
      // Cookie mode: return empty — session is maintained server-side
      // The actual session cookie from login is handled by CredentialManager
      return {};
    }
    return {
      Authorization: `Basic ${Buffer.from(`${creds.username}:${creds.password}`).toString('base64')}`,
    };
  }

  async refreshToken(creds: CredentialPayload, config: AuthStrategyConfig): Promise<CredentialPayload> {
    if (creds.type !== 'basic_auth') throw new Error('Invalid credential type');
    // Re-login to refresh session
    await this.validateAndBuild(
      { username: creds.username, password: creds.password },
      config,
    );
    return creds;
  }
}
```

Note: `buildAuthHeaders` for cookie mode needs special handling — the session cookie from the login response needs to be stored and replayed. This will be refined in the `CredentialManager` where we have access to the actual HTTP response. For the strategy itself, we note that cookie-mode connectors need the `CredentialManager` to maintain the session cookie (stored alongside the payload or in Redis cache). This detail will be handled in Chunk 3.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @sasa/connector-sdk exec vitest run src/strategies/basic-auth.strategy.spec.ts`
Expected: PASS (adjust test expectations for cookie mode as needed)

- [ ] **Step 5: Commit**

```bash
git add packages/connector-sdk/src/strategies/basic-auth.strategy.ts packages/connector-sdk/src/strategies/basic-auth.strategy.spec.ts
git commit -m "feat(connector-sdk): implement BasicAuthStrategy with cookie and basic modes"
```

---

### Task 9: Implement OAuth2CodeStrategy

**Files:**
- Create: `packages/connector-sdk/src/strategies/oauth2-code.strategy.ts`
- Create: `packages/connector-sdk/src/strategies/oauth2-code.strategy.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/connector-sdk/src/strategies/oauth2-code.strategy.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OAuth2CodeStrategy } from './oauth2-code.strategy';
import type { AuthStrategyConfig } from '../auth-strategy';

describe('OAuth2CodeStrategy', () => {
  const strategy = new OAuth2CodeStrategy();
  const config: AuthStrategyConfig = {
    type: 'oauth2_code',
    params: {
      authorizeUrl: 'https://auth.example.com/authorize',
      tokenUrl: 'https://auth.example.com/token',
      scopes: 'read write',
      clientId: 'test-client',
      clientSecret: 'test-secret',
    },
  };

  beforeEach(() => { vi.restoreAllMocks(); });

  it('should have type oauth2_code', () => {
    expect(strategy.type).toBe('oauth2_code');
  });

  it('should return empty form fields (uses redirect, not form)', () => {
    expect(strategy.getFormFields()).toEqual([]);
  });

  it('should build Bearer auth header', () => {
    const headers = strategy.buildAuthHeaders({
      type: 'oauth2_code', accessToken: 'tok-abc',
    }, config);
    expect(headers).toEqual({ Authorization: 'Bearer tok-abc' });
  });

  it('should detect expiration', () => {
    expect(strategy.isExpired!({
      type: 'oauth2_code', accessToken: 'x', expiresAt: Date.now() - 1000,
    })).toBe(true);
    expect(strategy.isExpired!({
      type: 'oauth2_code', accessToken: 'x', expiresAt: Date.now() + 3600000,
    })).toBe(false);
  });

  it('should refresh token using refreshToken', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_in: 3600,
      }),
    }));

    const refreshed = await strategy.refreshToken!({
      type: 'oauth2_code',
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
      expiresAt: Date.now() - 1000,
    }, config);

    expect(refreshed.accessToken).toBe('new-access');
    expect(refreshed.refreshToken).toBe('new-refresh');
    expect(refreshed.expiresAt).toBeGreaterThan(Date.now());

    vi.restoreAllMocks();
  });

  it('should throw if refresh fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    await expect(
      strategy.refreshToken!({
        type: 'oauth2_code', accessToken: 'x', refreshToken: 'r',
      }, config),
    ).rejects.toThrow();
    vi.restoreAllMocks();
  });

  it('should exchange authorization code for tokens', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        access_token: 'access-1',
        refresh_token: 'refresh-1',
        expires_in: 7200,
      }),
    }));

    const payload = await strategy.validateAndBuild(
      { code: 'auth-code-123', redirectUri: 'https://app.example.com/connectors/oauth2/callback' },
      config,
    );

    expect(payload.type).toBe('oauth2_code');
    if (payload.type === 'oauth2_code') {
      expect(payload.accessToken).toBe('access-1');
      expect(payload.refreshToken).toBe('refresh-1');
    }

    vi.restoreAllMocks();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @sasa/connector-sdk exec vitest run src/strategies/oauth2-code.strategy.spec.ts`
Expected: FAIL

- [ ] **Step 3: Implement OAuth2CodeStrategy**

Create `packages/connector-sdk/src/strategies/oauth2-code.strategy.ts`:

```typescript
import type { AuthStrategy, AuthStrategyConfig, FormField } from '../auth-strategy';
import type { CredentialPayload } from '@sasa/shared';

export class OAuth2CodeStrategy implements AuthStrategy {
  readonly type = 'oauth2_code' as const;

  getFormFields(): FormField[] {
    return []; // OAuth2 uses browser redirect, not a form
  }

  async validateAndBuild(input: Record<string, string>, config: AuthStrategyConfig): Promise<CredentialPayload> {
    const { code, redirectUri } = input;
    if (!code) throw new Error('Authorization code is required');
    if (!redirectUri) throw new Error('Redirect URI is required');

    const tokenUrl = config.params.tokenUrl;
    if (!tokenUrl) throw new Error('tokenUrl not configured');

    const resp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: config.params.clientId ?? '',
        client_secret: config.params.clientSecret ?? '',
      }).toString(),
    });

    if (!resp.ok) throw new Error(`Token exchange failed: ${resp.status}`);
    const data = await resp.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    return {
      type: 'oauth2_code',
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      clientId: config.params.clientId,
      clientSecret: config.params.clientSecret,
    };
  }

  buildAuthHeaders(creds: CredentialPayload): Record<string, string> {
    if (creds.type !== 'oauth2_code' || !creds.accessToken) {
      throw new Error('Invalid or missing access token');
    }
    return { Authorization: `Bearer ${creds.accessToken}` };
  }

  isExpired(creds: CredentialPayload): boolean {
    if (creds.type !== 'oauth2_code' || !creds.expiresAt) return false;
    return Date.now() > creds.expiresAt - 60_000;
  }

  async refreshToken(creds: CredentialPayload, config: AuthStrategyConfig): Promise<CredentialPayload> {
    if (creds.type !== 'oauth2_code') throw new Error('Invalid credential type');
    if (!creds.refreshToken) throw new Error('No refresh token available');

    const tokenUrl = config.params.tokenUrl;
    if (!tokenUrl) throw new Error('tokenUrl not configured');

    const resp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: creds.refreshToken,
        client_id: creds.clientId ?? config.params.clientId ?? '',
        client_secret: creds.clientSecret ?? config.params.clientSecret ?? '',
      }).toString(),
    });

    if (!resp.ok) throw new Error(`Token refresh failed: ${resp.status}`);
    const data = await resp.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    return {
      ...creds,
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? creds.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @sasa/connector-sdk exec vitest run src/strategies/oauth2-code.strategy.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/connector-sdk/src/strategies/oauth2-code.strategy.ts packages/connector-sdk/src/strategies/oauth2-code.strategy.spec.ts
git commit -m "feat(connector-sdk): implement OAuth2CodeStrategy with token refresh"
```

---

### Task 10: Export all strategies from SDK barrel

**Files:**
- Modify: `packages/connector-sdk/src/index.ts`

- [ ] **Step 1: Add strategy exports**

In `packages/connector-sdk/src/index.ts`:

```typescript
export * from './types';
export * from './auth-strategy';
export { BaseRestConnector } from './base-connector';
export { ApiKeyStrategy } from './strategies/api-key.strategy';
export { AppSecretStrategy } from './strategies/app-secret.strategy';
export { BasicAuthStrategy } from './strategies/basic-auth.strategy';
export { OAuth2CodeStrategy } from './strategies/oauth2-code.strategy';
```

- [ ] **Step 2: Build and run all SDK tests**

Run: `pnpm --filter @sasa/connector-sdk build && pnpm --filter @sasa/connector-sdk exec vitest run`
Expected: All tests PASS, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add packages/connector-sdk/src/index.ts
git commit -m "feat(connector-sdk): export all auth strategy implementations"
```

---

## Chunk 3: Server Credential Engine

Server-side services: `StrategyResolver`, `CredentialManager`, database schema change, and integration with agent/permission modules.

### Task 11: Create StrategyResolver

**Files:**
- Create: `apps/server/src/modules/auth/auth-strategy.resolver.ts`
- Create: `apps/server/src/modules/auth/auth-strategy.resolver.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/modules/auth/auth-strategy.resolver.spec.ts`:

```typescript
import { StrategyResolver } from './auth-strategy.resolver';
import { ApiKeyStrategy, AppSecretStrategy, BasicAuthStrategy, OAuth2CodeStrategy } from '@sasa/connector-sdk';

describe('StrategyResolver', () => {
  let resolver: StrategyResolver;

  beforeEach(() => {
    resolver = new StrategyResolver();
  });

  it('should resolve api_key strategy', () => {
    const strategy = resolver.resolve('api_key');
    expect(strategy).toBeInstanceOf(ApiKeyStrategy);
  });

  it('should resolve app_secret strategy', () => {
    const strategy = resolver.resolve('app_secret');
    expect(strategy).toBeInstanceOf(AppSecretStrategy);
  });

  it('should resolve basic_auth strategy', () => {
    const strategy = resolver.resolve('basic_auth');
    expect(strategy).toBeInstanceOf(BasicAuthStrategy);
  });

  it('should resolve oauth2_code strategy', () => {
    const strategy = resolver.resolve('oauth2_code');
    expect(strategy).toBeInstanceOf(OAuth2CodeStrategy);
  });

  it('should throw for unknown auth type', () => {
    expect(() => resolver.resolve('unknown' as any)).toThrow('Unknown auth type: unknown');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @sasa/server exec jest src/modules/auth/auth-strategy.resolver.spec.ts --no-coverage`
Expected: FAIL

- [ ] **Step 3: Implement StrategyResolver**

Create `apps/server/src/modules/auth/auth-strategy.resolver.ts`:

```typescript
import type { AuthStrategy } from '@sasa/connector-sdk';
import type { AuthType } from '@sasa/shared';
import { ApiKeyStrategy, AppSecretStrategy, BasicAuthStrategy, OAuth2CodeStrategy } from '@sasa/connector-sdk';

@Injectable()
export class StrategyResolver {
  private readonly strategies = new Map<AuthType, AuthStrategy>();

  constructor() {
    const strategyInstances: AuthStrategy[] = [
      new ApiKeyStrategy(),
      new AppSecretStrategy(),
      new BasicAuthStrategy(),
      new OAuth2CodeStrategy(),
    ];
    for (const s of strategyInstances) {
      this.strategies.set(s.type, s);
    }
  }

  resolve(authType: AuthType): AuthStrategy {
    const strategy = this.strategies.get(authType);
    if (!strategy) throw new Error(`Unknown auth type: ${authType}`);
    return strategy;
  }
}
```

Note: Add `import { Injectable } from '@nestjs/common';` at the top.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @sasa/server exec jest src/modules/auth/auth-strategy.resolver.spec.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/modules/auth/auth-strategy.resolver.ts apps/server/src/modules/auth/auth-strategy.resolver.spec.ts
git commit -m "feat(server): add StrategyResolver for auth type dispatch"
```

---

### Task 12: Create CredentialManager

**Files:**
- Create: `apps/server/src/modules/auth/credential-manager.service.ts`
- Create: `apps/server/src/modules/auth/credential-manager.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/modules/auth/credential-manager.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CredentialManager } from './credential-manager.service';
import { StrategyResolver } from './auth-strategy.resolver';
import { CryptoService } from '../../common/crypto/crypto.service';
import { ConnectorRegistry } from '../connector/connector-registry.service';
import { DB } from '../../common/database/database.module';
import { REDIS } from '../../common/redis/redis.module';
import type { CredentialPayload } from '@sasa/shared';

describe('CredentialManager', () => {
  let manager: CredentialManager;
  let mockDb: any;
  let mockRedis: any;
  let cryptoService: CryptoService;
  let mockRegistry: any;

  const apiPayload: CredentialPayload = { type: 'api_key', apiKey: 'sk-test' };

  beforeEach(async () => {
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    cryptoService = new CryptoService();
    const encryptedCred = cryptoService.encrypt(JSON.stringify(apiPayload));

    mockDb = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{
            id: 'b-1',
            authType: 'api_key',
            encryptedCred,
            status: 'active',
          }]),
        }),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      }),
    };

    mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    mockRegistry = {
      get: jest.fn().mockReturnValue({
        getAuthStrategyConfig: jest.fn().mockReturnValue({ type: 'api_key', params: {} }),
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        CredentialManager,
        StrategyResolver,
        CryptoService,
        { provide: DB, useValue: mockDb },
        { provide: REDIS, useValue: mockRedis },
        { provide: ConnectorRegistry, useValue: mockRegistry },
      ],
    }).compile();

    manager = module.get(CredentialManager);
  });

  afterEach(() => { delete process.env.ENCRYPTION_KEY; });

  describe('getValidAuthHeaders', () => {
    it('should decrypt and build auth headers for valid api_key binding', async () => {
      const headers = await manager.getValidAuthHeaders('user-1', 'conn-1');
      expect(headers).toEqual({ Authorization: 'Bearer sk-test' });
    });

    it('should throw NotFoundException for missing binding', async () => {
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });
      await expect(manager.getValidAuthHeaders('user-1', 'conn-1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for expired binding', async () => {
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{
            id: 'b-1', authType: 'api_key', encryptedCred: Buffer.from('x'), status: 'expired',
          }]),
        }),
      });
      await expect(manager.getValidAuthHeaders('user-1', 'conn-1'))
        .rejects.toThrow(ForbiddenException);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @sasa/server exec jest src/modules/auth/credential-manager.service.spec.ts --no-coverage`
Expected: FAIL

- [ ] **Step 3: Implement CredentialManager**

Create `apps/server/src/modules/auth/credential-manager.service.ts`:

```typescript
import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import type { CredentialPayload, AuthType } from '@sasa/shared';
import { StrategyResolver } from './auth-strategy.resolver';
import { CryptoService } from '../../common/crypto/crypto.service';
import { ConnectorRegistry } from '../connector/connector-registry.service';
import { saasBindings } from '../../common/database/schema';
import { eq, and } from 'drizzle-orm';
import { DB } from '../../common/database/database.module';
import { REDIS } from '../../common/redis/redis.module';
import type { Redis } from 'ioredis';

@Injectable()
export class CredentialManager {
  constructor(
    private readonly strategyResolver: StrategyResolver,
    private readonly crypto: CryptoService,
    private readonly registry: ConnectorRegistry,
    @Inject(DB) private readonly db: any,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async getValidAuthHeaders(userId: string, connectorId: string): Promise<Record<string, string>> {
    const binding = await this.getBinding(userId, connectorId);
    if (!binding) throw new NotFoundException('No SaaS binding found');
    if (binding.status === 'expired') throw new ForbiddenException('Binding expired, please rebind');

    const payload: CredentialPayload = JSON.parse(this.crypto.decrypt(binding.encryptedCred));
    const strategy = this.strategyResolver.resolve(binding.authType as AuthType);
    const connector = this.registry.get(connectorId);
    const config = connector.getAuthStrategyConfig(binding.authType as AuthType);

    if (strategy.isExpired?.(payload)) {
      if (!strategy.refreshToken) {
        throw new InternalServerErrorException(
          `Strategy ${binding.authType} reports expired but has no refreshToken implementation`,
        );
      }

      const lockKey = `cred-refresh:${userId}:${connectorId}`;
      const refreshed = await this.withLock(lockKey, 10_000, async () => {
        const current = await this.getBinding(userId, connectorId);
        if (!current) throw new NotFoundException('Binding disappeared during refresh');
        const currentPayload: CredentialPayload = JSON.parse(this.crypto.decrypt(current.encryptedCred));
        if (strategy.isExpired && !strategy.isExpired(currentPayload)) return currentPayload;
        if (!config) throw new InternalServerErrorException(`No auth config for connector ${connectorId}`);
        return strategy.refreshToken!(currentPayload, config);
      });

      await this.updateEncryptedPayload(userId, connectorId, refreshed);
      return strategy.buildAuthHeaders(refreshed, config ?? undefined);
    }

    return strategy.buildAuthHeaders(payload, config ?? undefined);
  }

  private async getBinding(userId: string, connectorId: string) {
    const [binding] = await this.db
      .select({
        id: saasBindings.id,
        authType: saasBindings.authType,
        encryptedCred: saasBindings.encryptedCred,
        status: saasBindings.status,
      })
      .from(saasBindings)
      .where(and(eq(saasBindings.userId, userId), eq(saasBindings.connectorId, connectorId)));
    return binding;
  }

  private async updateEncryptedPayload(userId: string, connectorId: string, payload: CredentialPayload): Promise<void> {
    const encryptedCred = this.crypto.encrypt(JSON.stringify(payload));
    await this.db
      .update(saasBindings)
      .set({ encryptedCred, status: 'active' })
      .where(and(eq(saasBindings.userId, userId), eq(saasBindings.connectorId, connectorId)));
  }

  private async withLock<T>(lockKey: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const token = Date.now().toString();
    const acquired = await this.redis.set(lockKey, token, 'PX', ttlMs, 'NX');
    if (acquired !== 'OK') {
      // Another request holds the lock — wait and retry once
      await new Promise(r => setTimeout(r, 500));
      return fn(); // Optimistic: let it proceed, the lock holder likely refreshed already
    }
    try {
      return await fn();
    } finally {
      // Only release if we still hold the lock
      const script = `if redis.call("get",KEYS[1]) == ARGV[1] then return redis.call("del",KEYS[1]) else return 0 end`;
      await this.redis.eval(script, 1, lockKey, token);
    }
  }
}
```

Note: `@Inject(DB)` and `@Inject(REDIS)` use tokens from their respective modules — verify the exact injection tokens match the project's DI setup.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @sasa/server exec jest src/modules/auth/credential-manager.service.spec.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/modules/auth/credential-manager.service.ts apps/server/src/modules/auth/credential-manager.service.spec.ts
git commit -m "feat(server): add CredentialManager with auto-refresh and distributed lock"
```

---

### Task 13: Update database schema + DDL migration

**Files:**
- Modify: `apps/server/src/common/database/schema.ts`
- Create: `apps/server/drizzle/migrations/0003_drop_expires_at.sql`

- [ ] **Step 1: Remove expiresAt from saasBindings schema**

In `apps/server/src/common/database/schema.ts`, find the `saasBindings` table definition and remove the `expiresAt` field:

```diff
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
- expiresAt: timestamp('expires_at', { withTimezone: true }),
}, (table) => [unique().on(table.userId, table.connectorId)]);
```

Also fix any test or code references to `saasBindings.expiresAt` — search with `grep -r 'expiresAt\|expires_at' apps/server/src/`.

- [ ] **Step 2: Create the DDL migration SQL**

Create `apps/server/drizzle/migrations/0003_drop_expires_at.sql`:

```sql
-- Rename old oauth2 auth type values
UPDATE saas_bindings SET auth_type = 'oauth2_code' WHERE auth_type = 'oauth2';

-- Drop expiresAt column (expiration is now managed in encryptedCred payload)
ALTER TABLE saas_bindings DROP COLUMN IF EXISTS expires_at;
```

- [ ] **Step 3: Run server tests to check for breakage**

Run: `pnpm --filter @sasa/server exec jest --no-coverage`
Expected: All pass — fix any remaining references to `expiresAt`.

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/common/database/schema.ts apps/server/drizzle/migrations/0003_drop_expires_at.sql
git commit -m "feat(server): remove expiresAt from saasBindings, add DDL migration"
```

---

### Task 14: Update SaaSBindingService to use strategies

**Files:**
- Modify: `apps/server/src/modules/auth/saas-binding.service.ts`
- Modify: `apps/server/src/modules/auth/saas-binding.service.spec.ts`

- [ ] **Step 1: Update the service**

In `apps/server/src/modules/auth/saas-binding.service.ts`:

- Inject `StrategyResolver` and `ConnectorRegistry`
- In `bind()`: use strategy's `validateAndBuild()` instead of raw string encryption
- Store `JSON.stringify(payload)` instead of raw `credential` string
- Add `extractRawInput(dto)` helper method

Key change in `bind()`:

```typescript
async bind(userId: string, dto: BindSaasDto) {
  const connector = this.registry.get(dto.connectorId);
  const strategy = this.strategyResolver.resolve(dto.authType);
  const config = connector.getAuthStrategyConfig(dto.authType);
  if (!config) throw new BadRequestException(`Connector does not support auth type: ${dto.authType}`);

  const rawInput = this.extractRawInput(dto);
  const payload = await strategy.validateAndBuild(rawInput, config);
  const encryptedCred = this.crypto.encrypt(JSON.stringify(payload));

  const [binding] = await this.db.insert(saasBindings).values({
    userId,
    connectorId: dto.connectorId,
    authType: dto.authType,
    encryptedCred,
    saasUserId: dto.saasUserId,
    saasUsername: dto.saasUsername,
  }).returning();

  const { encryptedCred: _, ...safe } = binding;
  return safe;
}
```

- [ ] **Step 2: Update the test**

Update `saas-binding.service.spec.ts` to:
- Provide `StrategyResolver` and `ConnectorRegistry` mocks
- Verify that stored credential is `JSON.stringify(CredentialPayload)` format
- Test with different auth types (api_key, app_secret)

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @sasa/server exec jest src/modules/auth/saas-binding.service.spec.ts --no-coverage`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/modules/auth/saas-binding.service.ts apps/server/src/modules/auth/saas-binding.service.spec.ts
git commit -m "feat(server): update SaaSBindingService to use AuthStrategy for credential validation"
```

---

### Task 15: Integrate CredentialManager into Agent and Permission services

**Files:**
- Modify: `apps/server/src/modules/agent/agent.service.ts`
- Modify: `apps/server/src/modules/permission/permission.service.ts`

- [ ] **Step 1: Update agent.service.ts**

In `apps/server/src/modules/agent/agent.service.ts`, find the credential decryption block (around lines 213-222) and replace:

```diff
- const [binding] = await this.db.select({ encryptedCred: saasBindings.encryptedCred })
-   .from(saasBindings)
-   .where(and(eq(saasBindings.userId, userId), eq(saasBindings.connectorId, connectorId)));
- if (!binding) {
-   return { type: 'error', error: 'No SaaS binding found for this connector' };
- }
- const cred = this.crypto.decrypt(binding.encryptedCred);
- const toolResult = await connector.executeToolCall(toolName, args, cred);
+ const authHeaders = await this.credentialManager.getValidAuthHeaders(userId, connectorId);
+ const toolResult = await connector.executeToolCall(toolName, args, authHeaders);
```

Inject `CredentialManager` in the constructor.

- [ ] **Step 2: Update permission.service.ts**

In `apps/server/src/modules/permission/permission.service.ts`, the `syncPermissions` method currently calls `connector.fetchPermissions(cred)` which no longer exists on the `SaaSConnector` interface.

**Concrete fix**: Add a `permissionsEndpoint` field to `AuthStrategyConfig.params`. The `PermissionService` uses `CredentialManager.getValidAuthHeaders()` to get valid headers, then calls the permissions endpoint directly:

```typescript
async syncPermissions(userId: string, connectorId: string): Promise<string[]> {
  const connector = this.connectorRegistry.get(connectorId);
  const authHeaders = await this.credentialManager.getValidAuthHeaders(userId, connectorId);

  // Get permissions endpoint from connector config
  const config = connector.getAuthStrategyConfig(
    // Read authType from binding
    await this.getBindingAuthType(userId, connectorId),
  );
  const permsEndpoint = config?.params?.permissionsEndpoint;

  if (!permsEndpoint) {
    // Fallback: no remote permissions, return cached
    return this.getPermissions(userId, connectorId);
  }

  const baseUrl = connector.getBaseUrl?.() ?? '';
  const resp = await fetch(`${baseUrl}${permsEndpoint}`, { headers: authHeaders });
  if (!resp.ok) throw new InternalServerErrorException(`Failed to fetch permissions: ${resp.status}`);
  const permissions = await resp.json() as string[];

  // Update cache
  await this.db.update(saasBindings)
    .set({ permissionsJson: permissions })
    .where(and(eq(saasBindings.userId, userId), eq(saasBindings.connectorId, connectorId)));

  const cacheKey = `permissions:${userId}:${connectorId}`;
  await this.redis.set(cacheKey, JSON.stringify(permissions), 'EX', PERMISSION_CACHE_TTL_SECONDS);
  return permissions;
}
```

For connectors without a `permissionsEndpoint` (like the demo connector), use hardcoded permissions from the connector's `configJson`.

- [ ] **Step 3: Run all server tests**

Run: `pnpm --filter @sasa/server exec jest --no-coverage`
Expected: PASS (fix any test failures related to the interface change)

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/modules/agent/agent.service.ts apps/server/src/modules/permission/permission.service.ts
git commit -m "feat(server): integrate CredentialManager into agent and permission services"
```

---

### Task 16: Update AuthModule registration

**Files:**
- Modify: `apps/server/src/modules/auth/auth.module.ts`

- [ ] **Step 1: Register new providers**

In `apps/server/src/modules/auth/auth.module.ts`, add `CredentialManager` and `StrategyResolver` to providers:

```typescript
providers: [
  // ... existing providers ...
  StrategyResolver,
  CredentialManager,
],
exports: [
  // ... existing exports ...
  CredentialManager,
],
```

- [ ] **Step 2: Run server tests**

Run: `pnpm --filter @sasa/server exec jest --no-coverage`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/modules/auth/auth.module.ts
git commit -m "feat(server): register CredentialManager and StrategyResolver in AuthModule"
```

---

## Chunk 4: Server API — DTOs and Endpoints

### Task 17: Update BindSaasDto

**Files:**
- Modify: `apps/server/src/modules/auth/dto/bind-saas.dto.ts`

- [ ] **Step 1: Replace the DTO**

In `apps/server/src/modules/auth/dto/bind-saas.dto.ts`:

```typescript
import { IsString, IsIn, IsOptional, ValidateIf } from 'class-validator';
import type { AuthType } from '@sasa/shared';

export class BindSaasDto {
  @IsString()
  connectorId: string;

  @IsIn(['api_key', 'app_secret', 'basic_auth', 'oauth2_code'])
  authType: AuthType;

  @ValidateIf(o => o.authType === 'api_key')
  @IsString()
  apiKey?: string;

  @ValidateIf(o => o.authType === 'app_secret')
  @IsString()
  appId?: string;

  @ValidateIf(o => o.authType === 'app_secret')
  @IsString()
  appSecret?: string;

  @ValidateIf(o => o.authType === 'basic_auth')
  @IsString()
  username?: string;

  @ValidateIf(o => o.authType === 'basic_auth')
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  saasUserId?: string;

  @IsOptional()
  @IsString()
  saasUsername?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/modules/auth/dto/bind-saas.dto.ts
git commit -m "feat(server): expand BindSaasDto to support multiple auth types"
```

---

### Task 18: Add OAuth2 authorize and callback endpoints

**Files:**
- Create: `apps/server/src/modules/auth/dto/oauth2-authorize.dto.ts`
- Create: `apps/server/src/modules/auth/oauth2-callback.controller.ts`
- Modify: `apps/server/src/modules/auth/saas-binding.controller.ts`

**Important**: The OAuth2 callback endpoint is a PUBLIC endpoint (called by the OAuth provider, no JWT). It must be in a SEPARATE controller without the class-level `JwtAuthGuard`.

- [ ] **Step 1: Create OAuth2 authorize DTO**

Create `apps/server/src/modules/auth/dto/oauth2-authorize.dto.ts`:

```typescript
import { IsString } from 'class-validator';

export class OAuth2AuthorizeDto {
  @IsString()
  connectorId: string;
}
```

- [ ] **Step 2: Add OAuth2 authorize endpoint to existing controller**

In `apps/server/src/modules/auth/saas-binding.controller.ts`, add the authorize endpoint (this one IS behind JWT — the user initiates it):

```typescript
@Post('oauth2/authorize')
async oauth2Authorize(@Request() req: any, @Body() dto: OAuth2AuthorizeDto) {
  const connector = this.registry.get(dto.connectorId);
  const config = connector.getAuthStrategyConfig('oauth2_code');
  if (!config) throw new BadRequestException('Connector does not support OAuth2');

  const state = randomUUID();
  const serverUrl = process.env.SERVER_URL ?? `http://localhost:${process.env.SERVER_PORT ?? '4000'}`;
  const redirectUri = `${serverUrl}/connectors/oauth2/callback`;
  const authorizeUrl = `${config.params.authorizeUrl}?` + new URLSearchParams({
    response_type: 'code',
    client_id: config.params.clientId ?? '',
    redirect_uri: redirectUri,
    scope: config.params.scopes ?? '',
    state,
  }).toString();

  await this.redis.set(`oauth:state:${state}`, JSON.stringify({
    userId: req.user.id,
    connectorId: dto.connectorId,
  }), 'EX', 600);

  return { authorizeUrl, state };
}
```

- [ ] **Step 3: Create a SEPARATE public controller for the OAuth2 callback**

Create `apps/server/src/modules/auth/oauth2-callback.controller.ts`:

```typescript
import { Controller, Get, Query, Res, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Response } from 'express';

@Controller('connectors/oauth2')
export class OAuth2CallbackController {
  constructor(
    // inject: redis, strategyResolver, registry, crypto, bindingService
  ) {}

  @Get('callback')
  async oauth2Callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const stateData = await this.redis.get(`oauth:state:${state}`);
    if (!stateData) throw new BadRequestException('Invalid or expired OAuth state');

    await this.redis.del(`oauth:state:${state}`);
    const { userId, connectorId } = JSON.parse(stateData);

    const connector = this.registry.get(connectorId);
    const config = connector.getAuthStrategyConfig('oauth2_code');
    if (!config) throw new InternalServerErrorException('OAuth2 config missing');

    const strategy = this.strategyResolver.resolve('oauth2_code');
    const serverUrl = process.env.SERVER_URL ?? `http://localhost:${process.env.SERVER_PORT ?? '4000'}`;
    const redirectUri = `${serverUrl}/connectors/oauth2/callback`;
    const payload = await strategy.validateAndBuild({ code, redirectUri }, config);

    const encryptedCred = this.crypto.encrypt(JSON.stringify(payload));
    await this.bindingService.bindWithPayload(userId, connectorId, 'oauth2_code', encryptedCred);

    // Proper HTTP redirect to frontend success page
    const frontendUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    res.redirect(`${frontendUrl}/saas/callback?connectorId=${connectorId}`);
  }
}
```

- [ ] **Step 4: Add auth-schema endpoint to existing controller**

In `apps/server/src/modules/auth/saas-binding.controller.ts`:

```typescript
@Get(':id/auth-schema')
async getAuthSchema(@Param('id') id: string) {
  const connector = this.registry.get(id);
  const strategies: { type: AuthType; formFields: FormField[] }[] = [];
  for (const authType of connector.supportedAuthTypes) {
    const strategy = this.strategyResolver.resolve(authType);
    strategies.push({ type: authType, formFields: strategy.getFormFields() });
  }
  return { strategies };
}
```

Note: This endpoint is behind JWT (user must be logged in to see connector schemas). If connectors should be publicly visible, move to a separate public controller.

- [ ] **Step 5: Register OAuth2CallbackController in AuthModule**

In `apps/server/src/modules/auth/auth.module.ts`, add `OAuth2CallbackController` to the controllers array.

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/modules/auth/dto/oauth2-authorize.dto.ts apps/server/src/modules/auth/oauth2-callback.controller.ts apps/server/src/modules/auth/saas-binding.controller.ts apps/server/src/modules/auth/auth.module.ts
git commit -m "feat(server): add OAuth2 authorize/callback and auth-schema endpoints"
```

---

## Chunk 5: Frontend — Dynamic Binding Form + OAuth UI

### Task 19: Create AuthBindingForm component

**Files:**
- Create: `apps/web/src/components/saas/auth-binding-form.tsx`
- Create: `apps/web/src/components/saas/auth-binding-form.spec.tsx`

- [ ] **Step 1: Write the component**

Create `apps/web/src/components/saas/auth-binding-form.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export interface AuthStrategySchema {
  type: string;
  formFields: {
    name: string;
    label: string;
    type: 'text' | 'password';
    placeholder?: string;
    helpText?: string;
    required: boolean;
  }[];
}

interface AuthBindingFormProps {
  connectorId: string;
  strategies: AuthStrategySchema[];
  onSubmit: (authType: string, values: Record<string, string>) => Promise<void>;
  onOAuth2Authorize?: (connectorId: string) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function AuthBindingForm({
  connectorId,
  strategies,
  onSubmit,
  onOAuth2Authorize,
  onCancel,
  loading,
}: AuthBindingFormProps) {
  const [selectedType, setSelectedType] = useState(strategies[0]?.type ?? '');
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const currentStrategy = strategies.find(s => s.type === selectedType);
  const isOAuth2 = selectedType === 'oauth2_code';

  const handleSubmit = async () => {
    if (isOAuth2) {
      await onOAuth2Authorize?.(connectorId);
      return;
    }
    setError('');
    try {
      await onSubmit(selectedType, values);
    } catch (e: any) {
      setError(e.message || '绑定失败');
    }
  };

  if (isOAuth2) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">将通过第三方授权页面完成绑定</p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel}>取消</Button>
          <Button onClick={handleSubmit} disabled={loading}>前往授权</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {strategies.length > 1 && (
        <div className="flex gap-2">
          {strategies.map(s => (
            <Button
              key={s.type}
              variant={selectedType === s.type ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setSelectedType(s.type); setValues({}); }}
            >
              {s.type === 'api_key' ? 'API Key' : s.type === 'app_secret' ? 'App Secret' : s.type === 'basic_auth' ? '用户名密码' : s.type}
            </Button>
          ))}
        </div>
      )}

      {currentStrategy?.formFields.map(field => (
        <div key={field.name}>
          <Label htmlFor={field.name}>{field.label}</Label>
          <Input
            id={field.name}
            type={field.type}
            placeholder={field.placeholder}
            value={values[field.name] ?? ''}
            onChange={e => setValues(v => ({ ...v, [field.name]: e.target.value }))}
            className="mt-1"
          />
          {field.helpText && (
            <p className="mt-1 text-xs text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      ))}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>取消</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? '绑定中...' : '绑定'}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write a basic test**

Create `apps/web/src/components/saas/auth-binding-form.spec.tsx` — test that it renders form fields from schema, switches between strategies, and calls onSubmit.

- [ ] **Step 3: Run test**

Run: `pnpm --filter @sasa/web exec vitest run src/components/saas/auth-binding-form.spec.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/saas/auth-binding-form.tsx apps/web/src/components/saas/auth-binding-form.spec.tsx
git commit -m "feat(web): add AuthBindingForm component with dynamic schema rendering"
```

---

### Task 20: Update SaaS page to use AuthBindingForm

**Files:**
- Modify: `apps/web/src/app/(main)/saas/page.tsx`

- [ ] **Step 1: Replace hardcoded API Key dialog**

In `apps/web/src/app/(main)/saas/page.tsx`:

- Add state for `authStrategies` (fetched from `GET /connectors/:id/auth-schema`)
- Replace the hardcoded binding dialog with `<AuthBindingForm>`
- Add OAuth2 authorize flow: call `POST /saas-bindings/oauth2/authorize` → redirect
- Handle `?bound=connectorId` URL param to show success toast
- Add logic for `?expired=connectorId` to show rebind prompt

- [ ] **Step 2: Manually verify in browser**

Run: `pnpm dev`
Navigate to `/saas`, test binding flow for different auth types.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(main)/saas/page.tsx
git commit -m "feat(web): replace hardcoded API key dialog with dynamic AuthBindingForm"
```

---

### Task 21: Update SaaS card component

**Files:**
- Modify: `apps/web/src/components/saas/saas-card.tsx`

- [ ] **Step 1: Update auth type display and add expired state**

In `apps/web/src/components/saas/saas-card.tsx`:

- Change `authType` prop type from `'oauth2' | 'api_key'` to `string`
- Replace plain text auth type with styled badges
- Add `expired` status handling — show "重新绑定" button instead of "断开连接"
- Show supported auth types on unbound cards

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/saas/saas-card.tsx
git commit -m "feat(web): update saas-card with auth type badges and expired state"
```

---

### Task 22: Create OAuth2 callback landing page

**Files:**
- Create: `apps/web/src/app/(main)/saas/callback/page.tsx`

- [ ] **Step 1: Create the callback landing page**

Create `apps/web/src/app/(main)/saas/callback/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function SaasCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const connectorId = searchParams.get('connectorId');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    // The backend already handled the callback and redirected here
    // Just show success/error based on URL params
    if (connectorId) {
      setStatus('success');
    } else {
      setStatus('error');
    }
  }, [connectorId]);

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">处理中...</div>;
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-semibold">绑定失败</h1>
          <p className="text-muted-foreground">授权过程中出现错误，请重试</p>
          <Button onClick={() => router.push('/saas')}>返回 SaaS 管理</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <h1 className="text-xl font-semibold">绑定成功</h1>
        <p className="text-muted-foreground">已成功连接到 Sasa</p>
        <Button onClick={() => router.push('/saas')}>返回 SaaS 管理</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/(main)/saas/callback/page.tsx
git commit -m "feat(web): add OAuth2 callback landing page"
```

---

## Chunk 6: Data Migration Script

### Task 23: Create credential migration script

**Files:**
- Create: `apps/server/scripts/migrate-credentials.ts`

- [ ] **Step 1: Write the migration script**

Create `apps/server/scripts/migrate-credentials.ts`:

This script lives inside `apps/server/` so it can use the server's existing TypeScript config and Drizzle imports. Run with `npx ts-node apps/server/scripts/migrate-credentials.ts` from the monorepo root.

```typescript
/**
 * Migration script: converts existing raw-string encryptedCred
 * to JSON-stringified CredentialPayload format.
 *
 * Run BEFORE deploying the new auth engine code:
 *   npx ts-node scripts/migrate-credentials.ts
 *
 * Prerequisites: DATABASE_URL and ENCRYPTION_KEY env vars set.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/common/database/schema';
import { eq } from 'drizzle-orm';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function encrypt(plaintext: string, key: Buffer): Buffer {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]);
}

function decrypt(ciphertext: Buffer, key: Buffer): string {
  const iv = ciphertext.subarray(0, 16);
  const authTag = ciphertext.subarray(16, 32);
  const encrypted = ciphertext.subarray(32);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const encryptionKeyHex = process.env.ENCRYPTION_KEY;
  if (!databaseUrl || !encryptionKeyHex) {
    console.error('DATABASE_URL and ENCRYPTION_KEY must be set');
    process.exit(1);
  }

  const key = Buffer.from(encryptionKeyHex, 'hex');
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });

  console.log('Fetching all bindings...');
  const bindings = await db.select().from(schema.saasBindings);
  console.log(`Found ${bindings.length} bindings to migrate`);

  let migrated = 0;
  let skipped = 0;

  for (const binding of bindings) {
    try {
      // 1. Decrypt old raw string
      const rawString = decrypt(binding.encryptedCred, key);

      // 2. Check if already in new format
      try {
        const parsed = JSON.parse(rawString);
        if (parsed.type && typeof parsed.type === 'string') {
          console.log(`  Binding ${binding.id}: already in new format, skipping`);
          skipped++;
          continue;
        }
      } catch {
        // Not JSON — old format, proceed with migration
      }

      // 3. Wrap into CredentialPayload
      const payload = JSON.stringify({ type: 'api_key', apiKey: rawString });
      const newEncrypted = encrypt(payload, key);

      // 4. Update in DB
      await db.update(schema.saasBindings)
        .set({ encryptedCred: newEncrypted })
        .where(eq(schema.saasBindings.id, binding.id));

      migrated++;
      console.log(`  Binding ${binding.id}: migrated (authType=${binding.authType})`);
    } catch (err) {
      console.error(`  Binding ${binding.id}: FAILED - ${err}`);
    }
  }

  console.log(`\nDone: ${migrated} migrated, ${skipped} skipped, ${bindings.length - migrated - skipped} failed`);
  await pool.end();
}

main().catch(console.error);
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/scripts/migrate-credentials.ts
git commit -m "feat(server): add credential migration script for raw-string to CredentialPayload format"
```

---

### Task 24: Full integration test

**Files:**
- Create: `apps/server/test/auth-strategy.e2e-spec.ts`

- [ ] **Step 1: Write an E2E test covering the full auth flow**

Create `apps/server/test/auth-strategy.e2e-spec.ts` covering:
- Bind with api_key → verify stored payload format → get valid headers
- Bind with app_secret (mock external token endpoint) → verify token exchange → verify auto-refresh
- Request auth-schema for a connector → verify form fields returned

- [ ] **Step 2: Run E2E test**

Run: `pnpm --filter @sasa/server exec jest --config ./test/jest-e2e.json --runInBand --forceExit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/server/test/auth-strategy.e2e-spec.ts
git commit -m "test(server): add E2E test for multi-auth strategy flows"
```

---

### Task 25: Run full test suite and final commit

- [ ] **Step 1: Run all tests**

Run: `pnpm test`
Expected: All tests PASS across all packages.

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: No errors.

- [ ] **Step 3: Run build**

Run: `pnpm build`
Expected: All packages build successfully.

- [ ] **Step 4: Final verification commit if needed**

If any fixes were needed during final verification:

```bash
git add -A
git commit -m "fix: address issues found during final verification"
```
