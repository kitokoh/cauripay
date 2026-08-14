import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

/**
 * Chiffrement AES-256-GCM des documents KYC au repos.
 * Clé maîtresse issue de l'environnement (KYC_ENCRYPTION_KEY) — jamais committée.
 */
@Injectable()
export class DocumentCipher {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const secret = config.get<string>('KYC_ENCRYPTION_KEY') ?? 'dev-kyc-encryption-key-32bytes!';
    this.key = createHash('sha256').update(secret).digest(); // 32 octets
  }

  encrypt(plaintext: Buffer | string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv, tag, encrypted].map((b) => b.toString('base64')).join('.');
  }

  decrypt(payload: string): Buffer {
    const [ivB64, tagB64, dataB64] = payload.split('.');
    if (!ivB64 || !tagB64 || !dataB64) {
      throw new Error('Payload chiffré invalide');
    }
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
  }
}
