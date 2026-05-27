/**
 * Credential Migration Script
 *
 * Migrates existing raw-string credentials to CredentialPayload JSON format.
 * Run: npx ts-node -r tsconfig-paths/register apps/server/scripts/migrate-credentials.ts
 *
 * What it does:
 * 1. Connects to DB, fetches all saas_bindings
 * 2. For each binding: decrypt old raw string → check if already JSON (skip) → wrap into CredentialPayload → encrypt → update DB
 * 3. Logs warnings for oauth2 bindings with non-null expires_at (users must rebind)
 * 4. Reports summary: migrated, skipped, failed counts
 */

import * as crypto from 'crypto';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { saasBindings } from '../src/common/database/schema';

// ─── Crypto helpers (same as CryptoService) ─────────────────────────

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const hexKey = process.env.ENCRYPTION_KEY;
  if (!hexKey) throw new Error('ENCRYPTION_KEY environment variable is required');
  const key = Buffer.from(hexKey, 'hex');
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
  return key;
}

function encrypt(key: Buffer, plaintext: string): Buffer {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]);
}

function decrypt(key: Buffer, ciphertext: Buffer): string {
  if (ciphertext.length < 32) throw new Error('Invalid ciphertext: too short');
  const iv = ciphertext.subarray(0, 16);
  const authTag = ciphertext.subarray(16, 32);
  const encrypted = ciphertext.subarray(32);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

// ─── Helpers ─────────────────────────────────────────────────────────

function isCredentialPayload(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && 'type' in parsed;
  } catch {
    return false;
  }
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const key = getKey();
  const client = postgres(dbUrl);
  const db = drizzle(client, { schema: { saasBindings } });

  console.log('Fetching all saas_bindings...');
  const bindings = await db.select().from(saasBindings);
  console.log(`Found ${bindings.length} bindings\n`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  const warnings: string[] = [];

  for (const binding of bindings) {
    const { id, authType, encryptedCred } = binding;

    try {
      // Step 1: Decrypt existing credential
      const rawString = decrypt(key, encryptedCred);

      // Step 2: Check if already in CredentialPayload JSON format
      if (isCredentialPayload(rawString)) {
        console.log(`[SKIP] Binding ${id} (authType=${authType}) — already in JSON format`);
        skipped++;
        continue;
      }

      // Step 3: Warn about oauth2 bindings (cannot auto-migrate without refresh token)
      if (authType === 'oauth2' || authType === 'oauth2_code') {
        const warning = `[WARN] Binding ${id} (authType=${authType}) — OAuth2 binding with raw credential. User must rebind.`;
        console.log(warning);
        warnings.push(warning);
      }

      // Step 4: Wrap into CredentialPayload
      // All existing raw-string bindings are api_key type
      const payload = { type: 'api_key' as const, apiKey: rawString };
      const payloadJson = JSON.stringify(payload);

      // Step 5: Re-encrypt and update
      const newEncryptedCred = encrypt(key, payloadJson);
      await db.update(saasBindings)
        .set({ encryptedCred: newEncryptedCred, authType: 'api_key' })
        .where(eq(saasBindings.id, id));

      console.log(`[MIGRATED] Binding ${id} (authType=${authType}) → api_key CredentialPayload`);
      migrated++;
    } catch (err) {
      console.error(`[FAILED] Binding ${id} (authType=${authType}): ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  // Summary
  console.log('\n── Migration Summary ──');
  console.log(`  Total:    ${bindings.length}`);
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Failed:   ${failed}`);
  if (warnings.length > 0) {
    console.log(`  Warnings: ${warnings.length}`);
    warnings.forEach((w) => console.log(`    ${w}`));
  }

  await client.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
