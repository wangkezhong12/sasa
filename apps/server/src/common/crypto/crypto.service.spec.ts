import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    service = new CryptoService();
  });

  afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  it('should encrypt and decrypt correctly', () => {
    const plaintext = 'my-secret-api-key';
    const encrypted = service.encrypt(plaintext);
    expect(encrypted).toBeInstanceOf(Buffer);
    expect(service.decrypt(encrypted)).toBe(plaintext);
  });

  it('should produce different ciphertexts for same plaintext (random IV)', () => {
    const plaintext = 'same-input';
    const enc1 = service.encrypt(plaintext);
    const enc2 = service.encrypt(plaintext);
    expect(enc1.equals(enc2)).toBe(false);
    expect(service.decrypt(enc1)).toBe(plaintext);
    expect(service.decrypt(enc2)).toBe(plaintext);
  });

  it('should handle empty plaintext', () => {
    const encrypted = service.encrypt('');
    expect(service.decrypt(encrypted)).toBe('');
  });

  it('should throw on too-short ciphertext', () => {
    expect(() => service.decrypt(Buffer.alloc(0))).toThrow('too short');
    expect(() => service.decrypt(Buffer.alloc(16))).toThrow();
  });

  it('should throw on tampered ciphertext', () => {
    const encrypted = service.encrypt('secret');
    const tampered = Buffer.from(encrypted);
    tampered[32] = tampered[32]! ^ 0xff;
    expect(() => service.decrypt(tampered)).toThrow();
  });

  it('should throw when ENCRYPTION_KEY is missing', () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => new CryptoService()).toThrow('ENCRYPTION_KEY');
  });

  it('should throw when ENCRYPTION_KEY is wrong length', () => {
    process.env.ENCRYPTION_KEY = 'abcdef';
    expect(() => new CryptoService()).toThrow('32 bytes');
  });

  it('should handle unicode plaintext', () => {
    const plaintext = '中文密钥 🔑 日本語テスト';
    const encrypted = service.encrypt(plaintext);
    expect(service.decrypt(encrypted)).toBe(plaintext);
  });

  it('should produce Buffer output with IV + authTag + ciphertext layout', () => {
    const encrypted = service.encrypt('test');
    // 16 (IV) + 16 (authTag) + ciphertext
    expect(encrypted.length).toBeGreaterThanOrEqual(32);
  });
});
