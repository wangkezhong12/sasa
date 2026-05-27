/**
 * Unit tests for migration script logic.
 *
 * Tests the encrypt/decrypt round-trip and CredentialPayload wrapping
 * without requiring a database connection.
 */
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

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

function isCredentialPayload(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && 'type' in parsed;
  } catch {
    return false;
  }
}

describe('Migration Script Logic', () => {
  const testKey = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');

  describe('encrypt/decrypt round-trip', () => {
    it('should round-trip a raw API key string', () => {
      const raw = 'sk-demo-api-key-12345';
      const encrypted = encrypt(testKey, raw);
      const decrypted = decrypt(testKey, encrypted);
      expect(decrypted).toBe(raw);
    });

    it('should round-trip a CredentialPayload JSON', () => {
      const payload = JSON.stringify({ type: 'api_key', apiKey: 'sk-test' });
      const encrypted = encrypt(testKey, payload);
      const decrypted = decrypt(testKey, encrypted);
      expect(decrypted).toBe(payload);
      expect(JSON.parse(decrypted)).toEqual({ type: 'api_key', apiKey: 'sk-test' });
    });

    it('should produce different ciphertext each time (random IV)', () => {
      const raw = 'same-input';
      const enc1 = encrypt(testKey, raw);
      const enc2 = encrypt(testKey, raw);
      expect(enc1).not.toEqual(enc2); // Different IVs
      expect(decrypt(testKey, enc1)).toBe(raw);
      expect(decrypt(testKey, enc2)).toBe(raw);
    });
  });

  describe('isCredentialPayload', () => {
    it('should return true for valid CredentialPayload JSON', () => {
      expect(isCredentialPayload('{"type":"api_key","apiKey":"sk-xxx"}')).toBe(true);
      expect(isCredentialPayload('{"type":"app_secret","appId":"a","appSecret":"s"}')).toBe(true);
      expect(isCredentialPayload('{"type":"oauth2_code","accessToken":"at"}')).toBe(true);
    });

    it('should return false for raw strings', () => {
      expect(isCredentialPayload('sk-raw-api-key')).toBe(false);
      expect(isCredentialPayload('just-a-plain-string')).toBe(false);
    });

    it('should return false for non-object JSON', () => {
      expect(isCredentialPayload('"a string"')).toBe(false);
      expect(isCredentialPayload('42')).toBe(false);
      expect(isCredentialPayload('null')).toBe(false);
    });

    it('should return false for objects without type field', () => {
      expect(isCredentialPayload('{"apiKey":"sk-xxx"}')).toBe(false);
    });
  });

  describe('migration wrapping logic', () => {
    it('should wrap raw string into api_key CredentialPayload', () => {
      const raw = 'sk-original-key';
      const payload = { type: 'api_key' as const, apiKey: raw };
      const payloadJson = JSON.stringify(payload);

      // Simulate what the script does
      const encrypted = encrypt(testKey, payloadJson);
      const decrypted = decrypt(testKey, encrypted);
      const parsed = JSON.parse(decrypted);

      expect(parsed).toEqual({ type: 'api_key', apiKey: 'sk-original-key' });
    });

    it('should detect already-migrated bindings and skip them', () => {
      const raw = JSON.stringify({ type: 'api_key', apiKey: 'sk-test' });
      expect(isCredentialPayload(raw)).toBe(true);
    });
  });
});
