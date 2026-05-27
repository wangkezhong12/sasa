# Phase 2: API Endpoints + Frontend UI

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the multi-auth engine through API endpoints and build a schema-driven dynamic binding form with OAuth2 redirect UI on the frontend.

**Prerequisite:** Phase 1 (backend auth engine) must be complete and all tests passing.

**Tech Stack:** NestJS 11, Next.js 15, React, shadcn/ui, Tailwind CSS, Vitest (web)

**Spec:** `docs/superpowers/specs/2026-05-27-multi-auth-strategy-design.md`

**Validation Gate (must pass before git commit):**
1. All unit tests pass (`pnpm test`)
2. Integration tests pass
3. E2E test for binding + OAuth flows passes
4. Code review via `superpowers:requesting-code-review`
5. Build succeeds (`pnpm build`)
6. Manual browser verification of binding UI

---

## Chunk 4: Server API — DTOs and Endpoints

### Task 1: Update BindSaasDto

**Files:**
- Modify: `apps/server/src/modules/auth/dto/bind-saas.dto.ts`

- [ ] **Step 1: Replace the DTO** — multi-field with ValidateIf per authType, keep saasUserId/saasUsername optional
- [ ] **Step 2: Run server tests**
- [ ] **Step 3: Commit**

---

### Task 2: Add OAuth2 authorize and callback endpoints

**Files:**
- Create: `apps/server/src/modules/auth/dto/oauth2-authorize.dto.ts`
- Create: `apps/server/src/modules/auth/oauth2-callback.controller.ts` (PUBLIC, no JWT guard)
- Modify: `apps/server/src/modules/auth/saas-binding.controller.ts`
- Modify: `apps/server/src/modules/auth/auth.module.ts`

**Key design points:**
- OAuth2 callback is in a SEPARATE controller without `JwtAuthGuard` (it's called by the OAuth provider)
- Use `@Res() res.redirect()` for proper HTTP redirect (NOT `HttpException(302)`)
- `SERVER_URL` constructed from `SERVER_PORT` if not explicitly set
- Redis stores `oauth:state:{uuid}` with 10 min TTL

- [ ] **Step 1: Create OAuth2 authorize DTO**
- [ ] **Step 2: Add authorize endpoint** to existing controller (behind JWT)
- [ ] **Step 3: Create OAuth2CallbackController** — public, exchanges code for token, creates binding, redirects to frontend
- [ ] **Step 4: Add auth-schema endpoint** `GET /connectors/:id/auth-schema` to existing controller
- [ ] **Step 5: Register OAuth2CallbackController** in AuthModule
- [ ] **Step 6: Run server tests**
- [ ] **Step 7: Commit**

---

### Task 3: Add bindWithPayload method to SaaSBindingService

**Files:**
- Modify: `apps/server/src/modules/auth/saas-binding.service.ts`

The OAuth2 callback creates a binding from a pre-built `CredentialPayload` (bypasses DTO validation since the strategy already validated via code exchange).

- [ ] **Step 1: Add `bindWithPayload(userId, connectorId, authType, encryptedCred)` method** — upsert into saasBindings
- [ ] **Step 2: Run tests**
- [ ] **Step 3: Commit**

---

## Chunk 5: Frontend — Dynamic Binding Form + OAuth UI

### Task 4: Create AuthBindingForm component

**Files:**
- Create: `apps/web/src/components/saas/auth-binding-form.tsx`
- Create: `apps/web/src/components/saas/auth-binding-form.spec.tsx`

- [ ] **Step 1: Write the component** — receives `strategies: AuthStrategySchema[]`, renders tab selector if multiple, dynamic form fields from schema, OAuth2 redirect button, loading/error states
- [ ] **Step 2: Write test** — renders fields from schema, switches strategies, calls onSubmit, shows OAuth button
- [ ] **Step 3: Run test**
- [ ] **Step 4: Commit**

---

### Task 5: Update SaaS page to use AuthBindingForm

**Files:**
- Modify: `apps/web/src/app/(main)/saas/page.tsx`

- [ ] **Step 1: Replace hardcoded API Key dialog** — fetch auth-schema from `GET /connectors/:id/auth-schema`, render `<AuthBindingForm>`, handle OAuth authorize flow, handle `?bound=` and `?expired=` URL params
- [ ] **Step 2: Manual browser verification** — `pnpm dev`, navigate to `/saas`, test binding flows
- [ ] **Step 3: Commit**

---

### Task 6: Update SaaS card component

**Files:**
- Modify: `apps/web/src/components/saas/saas-card.tsx`

- [ ] **Step 1: Update** — auth type badges, expired state with "重新绑定" button, show supported auth types on unbound cards
- [ ] **Step 2: Commit**

---

### Task 7: Create OAuth2 callback landing page

**Files:**
- Create: `apps/web/src/app/(main)/saas/callback/page.tsx`

- [ ] **Step 1: Create landing page** — success/error states, "返回 SaaS 管理" button
- [ ] **Step 2: Commit**

---

## Phase 2 Validation Gate

### Task 8: Unit + Integration tests

- [ ] **Step 1: Run all unit tests**

Run: `pnpm test`
Expected: All PASS

- [ ] **Step 2: Run server integration tests**

Run: `pnpm --filter @sasa/server exec jest --no-coverage`

- [ ] **Step 3: Run build**

Run: `pnpm build`

### Task 9: E2E test for binding + OAuth flows

**Files:**
- Create: `apps/web/e2e/saas-binding.spec.ts`

- [ ] **Step 1: Write Playwright E2E test** — navigate to /saas, click bind, verify dynamic form renders, submit api_key binding, verify success state
- [ ] **Step 2: Run E2E test**

Run: `pnpm test:e2e`

- [ ] **Step 3: Commit**

### Task 10: Code review

- [ ] **Step 1: Request code review** via `superpowers:requesting-code-review`
- [ ] **Step 2: Fix any review findings**
- [ ] **Step 3: Final commit if needed**

### Task 11: Phase 2 complete — tag commit

- [ ] **Step 1: Tag the commit**

```bash
git tag -a phase-2-api-frontend -m "Phase 2 complete: API endpoints and dynamic binding UI"
```
