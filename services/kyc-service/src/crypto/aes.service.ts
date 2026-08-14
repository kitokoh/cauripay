import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Chiffrement AES-256-GCM des documents d'identité (GOURSI-024a).
 * Format au repos : iv:tag:cipher — le GCM authentifie le texte (détection de
 * toute altération). La clé vient de KYC_ENCRYPTION_KEY (jamais committée).
 */
@Injectable()
export class AesService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const raw = config.get<string>('env.encryptionKey') ?? '';
    if (raw.length < 32) {
      throw new Error('FATAL: KYC_ENCRYPTION_KEY trop courte (32 caractères minimum) — refus de démarrer.');
    }
    // 64 hex = 32 octets directs ; sinon clé dérivée par SHA-256 (stable, hors dépôt).
    if (/^[0-9a-fA-F]{64}$/.test(raw)) {
      this.key = Buffer.from(raw, 'hex');
    } else {
      this.key = createHash('sha256').update(raw).digest();
    }
  }

  encrypt(plaintext: string | Buffer): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv, tag, enc].map((b) => b.toString('base64url')).join(':');
  }

  decrypt(payload: string): Buffer {
    const [ivB64, tagB64, dataB64] = payload.split(':');
    if (!ivB64 || !tagB64 || !dataB64) throw new Error('Payload chiffré invalide');
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivB64, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64url')), decipher.final()]);
  }
}
