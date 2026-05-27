# Multi-Auth Strategy Engine Design

**Date**: 2026-05-27
**Status**: Draft
**Scope**: Full stack — backend engine, connector SDK, frontend UI

## Background

The current SaaS connector authentication system only supports `api_key` and `oauth2` (enum only, not implemented). Credentials are stored as a single encrypted string, passed as `Bearer ${credentials}` in all HTTP requests.

Chinese ERP systems (Kingdee, Yonyou, etc.) use diverse authentication mechanisms that this model cannot accommodate:

| Auth Type | Used By | Current Support |
|-----------|---------|----------------|
| API Key | Generic SaaS | Supported |
| AppID + AppSecret → AccessToken | Kingdee Cloud, YonBIP | Not supported |
| Username + Password → SessionId/Cookie | Kingdee on-premise WebAPI | Not supported |
| OAuth 2.0 Authorization Code | Feishu, DingTalk, future SaaS | Not supported |

Additionally, `app_secret` and `oauth2_code` require token refresh on expiration — currently unhandled.

## Design Goals

1. Foundational auth engine usable by both personal and enterprise product lines
2. Each auth type's logic self-contained in a Strategy class
3. Token auto-refresh transparent to the business layer
4. Frontend dynamically renders binding forms based on connector auth schema
5. Full OAuth 2.0 browser redirect flow

## Section 1: Core Types

### AuthType Enum (`packages/shared/src/types/auth.ts`)

```typescript
export type AuthType = 'api_key' | 'app_secret' | 'basic_auth' | 'oauth2_code';

export type CredentialPayload =
  | { type: 'api_key'; apiKey: string }
  | { type: 'app_secret'; appId: string; appSecret: string; accessToken?: string; expiresAt?: number }
  | { type: 'basic_auth'; username: string; password: string }
  | { type: 'oauth2_code'; accessToken: string; refreshToken?: string; expiresAt?: number; clientId?: string; clientSecret?: string };
```

### AuthStrategy Interface (`packages/connector-sdk/src/auth-strategy.ts`)

```typescript
export interface AuthStrategyConfig {
  type: AuthType;
  params: Record<string, string>;
}

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

  buildAuthHeaders(creds: CredentialPayload): Record<string, string>;

  isExpired?(creds: CredentialPayload): boolean;

  refreshToken?(
    creds: CredentialPayload,
    config: AuthStrategyConfig,
  ): Promise<CredentialPayload>;
}
```

### Key Design Decisions

- `CredentialPayload` is a discriminated union — each auth type has different fields, distinguished by the `type` field. Serialization/deserialization is straightforward via `JSON.stringify`/`JSON.parse`.
- `AuthStrategyConfig.params` is provided by the connector at registration time. For example, `app_secret` needs a `tokenUrl`, `oauth2_code` needs `authorizeUrl` + `tokenUrl` + `scopes`.
- `refreshToken` and `isExpired` are optional — `api_key` never expires and doesn't implement them; `app_secret` and `oauth2_code` do.

### SaaSConnector Interface Contract Change

The current `SaaSConnector` interface passes `credentials: string` to `executeToolCall`, `validateCredentials`, and `fetchPermissions`. This must change.

**New contract**: `CredentialManager` produces auth headers, connectors receive pre-built headers. The connector SDK never sees raw credentials.

```typescript
// packages/shared/src/types/connector.ts — updated
export interface SaaSConnector {
  name: string;
  version: string;
  protocol: 'rest' | 'mcp' | 'cli';
  supportedAuthTypes: AuthType[];
  getAuthStrategyConfig(authType: AuthType): AuthStrategyConfig | undefined;

  // credentials param removed — replaced with authHeaders from CredentialManager
  executeToolCall(
    toolName: string,
    parameters: Record<string, unknown>,
    authHeaders: Record<string, string>,
  ): Promise<ToolResult>;

  getToolDefinitions(): ConnectorToolDefinition[];

  // validateCredentials and fetchPermissions moved to AuthStrategy
  // (connector no longer responsible for credential validation)
}
```

**Full call chain**:

```
AgentService.executeToolCall()
  → this.credentialManager.getValidAuthHeaders(userId, connectorId)
      → reads binding from DB (gets authType + encryptedCred)
      → decrypts → JSON.parse → CredentialPayload (discriminated by type)
      → resolves Strategy via authType from the binding row
      → checks expiration, refreshes if needed
      → returns headers from strategy.buildAuthHeaders(payload)
  → connector.executeToolCall(toolName, args, headers)
      → BaseRestConnector spreads headers into fetch() call
```

**Why this direction**: Decouples credential lifecycle from connector implementations. Connectors only care about "give me headers, I make API calls." The Strategy owns credential validation, refresh, and header construction.

## Section 2: Strategy Implementations

### ApiKeyStrategy

```
User input: API Key string
Stored payload: { type: 'api_key', apiKey: 'sk-xxx' }
Auth headers: Authorization: Bearer sk-xxx
Refresh: Not needed (never expires)
```

Wraps the current behavior into a Strategy. Simplest case.

### AppSecretStrategy (Kingdee Cloud, YonBIP)

```
User input: AppID + AppSecret
Bind flow:
  Frontend submits AppID/AppSecret
    → Strategy.validateAndBuild()
    → Calls connector's configured tokenUrl to exchange for accessToken
    → Stores { type: 'app_secret', appId, appSecret, accessToken, expiresAt }
Auth headers: Authorization: Bearer {accessToken}
Refresh flow:
  isExpired() checks expiresAt
  refreshToken() reuses appId + appSecret to call tokenUrl again
  Updates DB with new CredentialPayload
```

Both `appId` and `appSecret` are persisted because they're needed for token refresh.

### BasicAuthStrategy (Kingdee on-premise WebAPI)

```
User input: Username + Password
Bind flow:
  Frontend submits username/password
    → Strategy.validateAndBuild()
    → Calls connector's configured loginUrl to verify credentials
    → Stores { type: 'basic_auth', username, password }
Auth headers:
  Cookie mode: Cookie: kdservice-sessionid={sessionId}
  Basic mode: Authorization: Basic base64(user:pass)
  Determined by connector's params.authMode ('cookie' | 'basic')
Refresh flow:
  isExpired() checks Redis cache for session validity (TTL 5 minutes)
  On cache miss, makes a lightweight API call to check session, then caches result
  refreshToken() re-calls loginUrl with stored username/password
```

The connector config `params.authMode` determines whether `buildAuthHeaders` uses Cookie or Basic auth.

### OAuth2CodeStrategy (Full browser redirect flow)

```
User clicks "Bind"
  → Backend generates state, returns authorizeUrl
  → Frontend redirects to third-party authorization page
  → User authorizes, third-party calls back to /auth/callback
  → Backend exchanges code + redirectUri for accessToken (and possibly refreshToken)
  → Stores { type: 'oauth2_code', accessToken, refreshToken, expiresAt }
Auth headers: Authorization: Bearer {accessToken}
Refresh flow:
  isExpired() checks expiresAt
  refreshToken() uses refreshToken to call tokenUrl
```

### Connector Config Examples

```typescript
// Kingdee Cloud connector
{
  type: 'app_secret',
  params: {
    tokenUrl: 'https://api.kingdee.com/auth/token',
    apiBaseUrl: 'https://api.kingdee.com/k3cloud',
  }
}

// Kingdee on-premise connector
{
  type: 'basic_auth',
  params: {
    loginUrl: 'https://erp.company.com/K3Cloud/Kingdee.BOS.WebApi.ServicesStub.ValidateService.ValidateUser.common.kdsvc',
    authMode: 'cookie',
  }
}

// Feishu/DingTalk connector (future)
{
  type: 'oauth2_code',
  params: {
    authorizeUrl: 'https://open.feishu.cn/open-apis/authen/v1/authorize',
    tokenUrl: 'https://open.feishu.cn/open-apis/authen/v1/oidc/access_token',
    scopes: 'contact:user.id:readonly',
  }
}
```

## Section 3: Storage Layer + Token Auto-Refresh

### Database Changes

`saas_bindings` table:

- `authType` varchar: extend values to `'api_key' | 'app_secret' | 'basic_auth' | 'oauth2_code'`
- `encryptedCred` bytea: stores `JSON.stringify(CredentialPayload)` encrypted with AES-256-GCM (no longer a raw string)
- Remove `expiresAt` column — expiration is managed within `CredentialPayload` by each Strategy, avoiding coupling between table schema and auth types

`saas_connectors` table:

- No new columns. Reuse existing `configJson` to include `authStrategies`:

```json
{
  "authStrategies": [
    { "type": "app_secret", "params": { "tokenUrl": "...", "apiBaseUrl": "..." } },
    { "type": "basic_auth", "params": { "loginUrl": "...", "authMode": "cookie" } }
  ]
}
```

### Migration

This migration requires an application-level script (not just DDL) because existing `encryptedCred` stores raw strings that must be restructured into `CredentialPayload` JSON.

```sql
-- Step 1: Rename old authType value
UPDATE saas_bindings SET auth_type = 'oauth2_code' WHERE auth_type = 'oauth2';

-- Step 2: Drop expiresAt column (data is now in encryptedCred payload)
ALTER TABLE saas_bindings DROP COLUMN expires_at;
```

**Application-level data migration** (run before deploying new code):

```typescript
// scripts/migrate-credentials.ts
// For each existing binding:
//   1. Decrypt encryptedCred → raw string
//   2. If auth_type is 'oauth2' and expires_at is non-null, log a warning
//      (partial OAuth2 bindings without refresh tokens — user must rebind)
//   3. Wrap into { type: 'api_key', apiKey: rawString } (all existing bindings are api_key)
//   4. Encrypt JSON.stringify(payload) → write back
```

Run order: application migration first → then deploy new code → then DDL migration.

### CredentialManager Service

Encapsulates credential retrieval and auto-refresh logic:

```typescript
@Injectable()
class CredentialManager {
  async getValidAuthHeaders(
    userId: string,
    connectorId: string,
  ): Promise<Record<string, string>> {
    // 1. Read binding from DB (gets both authType and encryptedCred)
    const binding = await this.getBinding(userId, connectorId);
    if (!binding) throw new NotFoundException('No SaaS binding found');
    if (binding.status === 'expired') throw new ForbiddenException('Binding expired, please rebind');

    // 2. Decrypt and parse payload
    const payload: CredentialPayload = JSON.parse(this.crypto.decrypt(binding.encryptedCred));

    // 3. Resolve strategy via authType from the binding row (not the connector)
    const strategy = this.strategyResolver.resolve(binding.authType);
    const connector = this.registry.get(connectorId);
    const config = connector.getAuthStrategyConfig(binding.authType);

    // 4. Auto-refresh if expired (with concurrency guard)
    if (strategy.isExpired?.(payload)) {
      if (!strategy.refreshToken) {
        throw new InternalServerErrorException(
          `Strategy ${binding.authType} reports expired but has no refreshToken implementation`
        );
      }
      // Distributed lock to prevent concurrent refresh race condition
      const lockKey = `cred-refresh:${userId}:${connectorId}`;
      const refreshed = await this.withLock(lockKey, async () => {
        // Re-read in case another request already refreshed
        const current = await this.getBinding(userId, connectorId);
        const currentPayload: CredentialPayload = JSON.parse(this.crypto.decrypt(current!.encryptedCred));
        if (strategy.isExpired && !strategy.isExpired(currentPayload)) return currentPayload;
        if (!config) throw new InternalServerErrorException(`No auth config for connector ${connectorId}`);
        return strategy.refreshToken(currentPayload, config);
      });
      await this.updateEncryptedPayload(userId, connectorId, refreshed);
      return strategy.buildAuthHeaders(refreshed);
    }

    return strategy.buildAuthHeaders(payload);
  }
}
```

Agent-side change is minimal — replace `this.crypto.decrypt(binding.encryptedCred)` with `this.credentialManager.getValidAuthHeaders(userId, connectorId)`.

### Refresh Failure Handling

```
refreshToken fails
  → CredentialManager catches the error in its getValidAuthHeaders method
  → Retry once (network jitter)
  → Still failing → CredentialManager sets binding.status = 'expired' via DB update
  → Throws ForbiddenException with message "ERP connection expired, please rebind"
  → Frontend shows rebind prompt
```

## Section 4: Backend API Changes

### Endpoints

```
Existing (modified):
  POST   /saas-bindings          Bind SaaS (extended DTO)
  GET    /saas-bindings          List bindings (extended response)
  DELETE /saas-bindings/:id      Unbind (unchanged)

New:
  POST   /saas-bindings/oauth2/authorize   Initiate OAuth2 redirect
  GET    /connectors/oauth2/callback       OAuth2 callback receiver
  GET    /connectors/:id/auth-schema       Get connector auth form schema
```

### Modified BindSaasDto

```typescript
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

  // oauth2_code does not use this DTO — uses /oauth2/authorize → /callback flow
}
```

### OAuth2 Redirect Flow APIs

**Initiate authorization**:

```typescript
// POST /saas-bindings/oauth2/authorize
// Request: { connectorId: string }
// Response: { authorizeUrl: string, state: string }
// Frontend: window.location.href = authorizeUrl
```

**Callback receiver**:

```typescript
// GET /connectors/oauth2/callback?code=xxx&state=yyy
// Backend: exchange code for token, create binding automatically
// Response: 302 redirect to /saas?bound=connectorId
```

**State management**: Redis key `oauth:state:{random}` → `{ userId, connectorId }`, TTL 10 minutes. Retrieved and deleted on callback.

### Auth Schema Endpoint

```typescript
// GET /connectors/:id/auth-schema
// Response:
{
  "strategies": [
    {
      "type": "app_secret",
      "formFields": [
        { "name": "appId", "label": "App ID", "type": "text", "required": true },
        { "name": "appSecret", "label": "App Secret", "type": "password", "required": true }
      ]
    },
    {
      "type": "basic_auth",
      "formFields": [
        { "name": "username", "label": "用户名", "type": "text", "required": true },
        { "name": "password", "label": "密码", "type": "password", "required": true }
      ]
    }
  ]
}
```

### SaaSBindingService.bind() Changes

```typescript
async bind(userId: string, dto: BindSaasDto) {
  // 1. Resolve connector and strategy
  const connector = this.registry.get(dto.connectorId);
  const strategy = this.strategyResolver.resolve(dto.authType);
  const config = connector.getAuthStrategyConfig(dto.authType);

  // 2. Strategy validates credentials + builds payload
  const rawInput = this.extractRawInput(dto);
  const payload = await strategy.validateAndBuild(rawInput, config);

  // 3. Encrypt and store
  const encryptedCred = this.crypto.encrypt(JSON.stringify(payload));

  // 4. Upsert (unique constraint on userId + connectorId)
}
```

## Section 5: Frontend Changes

### Dynamic Binding Form

Replace the hardcoded API Key input with a schema-driven dynamic form:

```
User clicks "Bind"
  → GET /connectors/:id/auth-schema
  → 1 strategy → show its form directly
  → Multiple strategies → show tab selector, render selected form
  → User fills form → POST /saas-bindings
  → If oauth2_code → redirect flow instead
```

### AuthBindingForm Component

```tsx
// components/saas/auth-binding-form.tsx
interface AuthBindingFormProps {
  connectorId: string;
  strategies: AuthStrategySchema[];
  onSuccess: () => void;
}
// Dynamically renders inputs based on formFields from auth-schema API
```

### OAuth2 Redirect Flow UI

```
User selects "OAuth 2.0"
  → Frontend calls POST /saas-bindings/oauth2/authorize
  → Gets { authorizeUrl, state }
  → window.location.href = authorizeUrl (redirect to third party)
  → ...user authorizes on third-party page...
  → Third party calls back to GET /connectors/oauth2/callback?code=xxx&state=yyy
  → Backend processes, 302 → /saas?bound=connectorId
  → Frontend detects URL param, shows success toast
```

Optional callback landing page (`/saas/callback`):

```
┌─────────────────────────┐
│                         │
│     ✓ 绑定成功           │
│                         │
│  飞书已成功连接到 Sasa    │
│                         │
│      [返回 SaaS 管理]    │
│                         │
└─────────────────────────┘
```

### SaaS Card Component Changes

- Auth type display: styled tags instead of plain text
- Add `expired` state — show "rebind" button instead of "disconnect"
- Show supported auth types on unbound connector cards

### Connector List Page Changes

Each connector card shows supported auth types as tags:

```
┌──────────────────────────┐
│  金蝶云星空                │
│  Kingdee K/3 Cloud       │
│                          │
│  支持: [App Secret] [密码]│
│                          │
│        [绑定]            │
└──────────────────────────┘
```

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `packages/shared/src/types/auth.ts` | AuthType, CredentialPayload types |
| `packages/connector-sdk/src/auth-strategy.ts` | AuthStrategy interface, FormField, AuthStrategyConfig |
| `packages/connector-sdk/src/strategies/api-key.strategy.ts` | ApiKeyStrategy |
| `packages/connector-sdk/src/strategies/app-secret.strategy.ts` | AppSecretStrategy |
| `packages/connector-sdk/src/strategies/basic-auth.strategy.ts` | BasicAuthStrategy |
| `packages/connector-sdk/src/strategies/oauth2-code.strategy.ts` | OAuth2CodeStrategy |
| `apps/server/src/modules/auth/credential-manager.service.ts` | CredentialManager |
| `apps/server/src/modules/auth/auth-strategy.resolver.ts` | StrategyResolver — maps AuthType to Strategy instance |
| `apps/server/src/modules/auth/dto/oauth2-authorize.dto.ts` | OAuth2 authorize request DTO |
| `apps/web/src/components/saas/auth-binding-form.tsx` | Dynamic binding form component |
| `apps/web/src/app/(main)/saas/callback/page.tsx` | OAuth2 callback landing page |

### Modified Files

| File | Change |
|------|--------|
| `packages/shared/src/types/connector.ts` | `supportedAuthTypes` expand to include new AuthType values |
| `packages/connector-sdk/src/base-connector.ts` | `executeToolCall` receives `authHeaders` instead of `credentials: string`; remove `buildAuthHeaders` private method; add `getAuthStrategyConfig` |
| `packages/connector-sdk/src/types.ts` | Re-export new auth types |
| `apps/server/src/common/database/schema.ts` | Remove `expiresAt` from `saasBindings`; `authType` value domain expansion |
| `apps/server/src/modules/auth/dto/bind-saas.dto.ts` | Expand to multi-field DTO |
| `apps/server/src/modules/auth/saas-binding.service.ts` | Use Strategy for validation; store `JSON.stringify(CredentialPayload)` |
| `apps/server/src/modules/auth/saas-binding.controller.ts` | Add OAuth2 endpoints, auth-schema endpoint |
| `apps/server/src/modules/auth/auth.module.ts` | Register CredentialManager, StrategyResolver, strategies |
| `apps/server/src/modules/connector/connectors/demo/index.ts` | Update `supportedAuthTypes` |
| `apps/server/src/modules/connector/connector-registry.service.ts` | Expose auth strategy config from connector |
| `apps/server/src/modules/agent/agent.service.ts` | Replace direct decrypt with `CredentialManager.getValidAuthHeaders()` |
| `apps/server/src/modules/permission/permission.service.ts` | Use CredentialManager instead of direct decrypt |
| `apps/web/src/components/saas/saas-card.tsx` | Auth type tags, expired state |
| `apps/web/src/app/(main)/saas/page.tsx` | Dynamic form, OAuth flow integration |
