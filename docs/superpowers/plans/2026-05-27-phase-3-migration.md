# Phase 3: Data Migration + Final Verification

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate existing raw-string credentials to CredentialPayload JSON format, verify the complete system end-to-end.

**Prerequisites:** Phase 1 and Phase 2 must be complete.

**Tech Stack:** TypeScript, Drizzle ORM, PostgreSQL

**Spec:** `docs/superpowers/specs/2026-05-27-multi-auth-strategy-design.md`

**Validation Gate (must pass before git commit):**
1. Migration script tested against test database
2. Full E2E suite passes (`pnpm test:e2e`)
3. All unit tests pass (`pnpm test`)
4. Code review via `superpowers:requesting-code-review`
5. Build succeeds (`pnpm build`)

---

## Task 1: Create credential migration script

**Files:**
- Create: `apps/server/scripts/migrate-credentials.ts`

- [ ] **Step 1: Write the migration script**

Script lives in `apps/server/scripts/` so it can use the server's TypeScript config. Run with `npx ts-node apps/server/scripts/migrate-credentials.ts` from monorepo root.

Logic:
1. Connect to DB, fetch all bindings
2. For each binding: decrypt old raw string → check if already JSON (skip if so) → wrap into `{ type: 'api_key', apiKey: rawString }` → encrypt → update DB
3. Log warnings for any `auth_type = 'oauth2'` bindings with non-null `expires_at` (users must rebind)
4. Report summary: migrated, skipped, failed counts

- [ ] **Step 2: Test migration script** against a test database with sample data

- [ ] **Step 3: Commit**

```bash
git add apps/server/scripts/migrate-credentials.ts
git commit -m "feat(server): add credential migration script for raw-string to CredentialPayload format"
```

---

## Task 2: Create DDL migration file

**Files:**
- Create: `apps/server/drizzle/migrations/0003_drop_expires_at.sql`

Note: This was created in Phase 1 Task 11 as part of the schema change. Verify it exists and is correct:

```sql
-- Rename old oauth2 auth type values
UPDATE saas_bindings SET auth_type = 'oauth2_code' WHERE auth_type = 'oauth2';

-- Drop expiresAt column
ALTER TABLE saas_bindings DROP COLUMN IF EXISTS expires_at;
```

- [ ] **Step 1: Verify migration file exists and is correct**
- [ ] **Step 2: If missing, create it and commit**

---

## Task 3: Test migration against real test data

- [ ] **Step 1: Seed test database** with sample bindings in old format (raw string encryptedCred)
- [ ] **Step 2: Run migration script**
- [ ] **Step 3: Verify all bindings** now have JSON CredentialPayload format
- [ ] **Step 4: Verify DDL migration** runs without errors
- [ ] **Step 5: Run all tests** to confirm no breakage

Run: `pnpm test`

---

## Task 4: Full E2E verification

- [ ] **Step 1: Run server E2E tests**

Run: `pnpm --filter @sasa/server exec jest --config ./test/jest-e2e.json --runInBand --forceExit`

- [ ] **Step 2: Run web E2E tests**

Run: `pnpm test:e2e`

- [ ] **Step 3: Run full build**

Run: `pnpm build`

- [ ] **Step 4: Run lint**

Run: `pnpm lint`

---

## Task 5: Code review

- [ ] **Step 1: Request code review** via `superpowers:requesting-code-review`
- [ ] **Step 2: Fix any review findings**
- [ ] **Step 3: Final commit if needed**

---

## Task 6: Phase 3 complete — final tag

- [ ] **Step 1: Tag the commit**

```bash
git tag -a phase-3-migration-complete -m "Phase 3 complete: data migration and final verification"
```

- [ ] **Step 2: Verify all three phases are tagged**

```bash
git tag -l 'phase-*'
```

Expected output:
```
phase-1-backend-auth-engine
phase-2-api-frontend
phase-3-migration-complete
```
