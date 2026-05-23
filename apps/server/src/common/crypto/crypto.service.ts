import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    const hexKey = process.env.ENCRYPTION_KEY;
    if (!hexKey) throw new Error('ENCRYPTION_KEY environment variable is required');
    this.key = Buffer.from(hexKey, 'hex');
    if (this.key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)');
    }
  }

  encrypt(plaintext: string): Buffer {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Layout: [16 bytes IV][16 bytes authTag][encrypted bytes]
    return Buffer.concat([iv, authTag, encrypted]);
  }

  decrypt(ciphertext: Buffer): string {
    if (ciphertext.length < 32) throw new Error('Invalid ciphertext: too short');
    const iv = ciphertext.subarray(0, 16);
    const authTag = ciphertext.subarray(16, 32);
    const encrypted = ciphertext.subarray(32);
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  }
}
