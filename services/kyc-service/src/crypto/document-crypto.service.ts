import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Chiffrement AES-256-GCM des documents KYC au repos (GOURSI-024a).
 * Clé : KYC_DOCUMENT_ENCRYPTION_KEY (base64, 32 octets) — injectée par
 * environnement, jamais dans le dépôt. Aucun document en clair dans les logs.
 */
@Injectable()
export class DocumentCryptoService {
  private static readonly IV_LENGTH = 12;
  private static readonly AUTH_TAG_LENGTH = 16;

  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const raw = this.config.get<string>('env.kycEncryptionKey') ?? '';
    if (!raw) {
      throw new Error(
        'KYC_ENCRYPTION_KEY manquante. Générer : openssl rand -base64 32 (ou toute chaîne dérivée en 32 octets)',
      );
    }
    let key = Buffer.from(raw, 'base64');
    if (key.length !== 32) {
      // clé texte : dériver 32 octets déterministes (sha256) — DX dev acceptable
      key = createHash('sha256').update(raw).digest();
    }
    this.key = key;
  }

  /** Chiffre un buffer → « iv || tag || ciphertext » en base64. */
  encrypt(plaintext: Buffer): string {
    const iv = randomBytes(DocumentCryptoService.IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ciphertext]).toString('base64');
  }

  /** Déchiffre un payload « iv || tag || ciphertext » base64. */
  decrypt(payloadBase64: string): Buffer {
    const payload = Buffer.from(payloadBase64, 'base64');
    const iv = payload.subarray(0, DocumentCryptoService.IV_LENGTH);
    const tag = payload.subarray(
      DocumentCryptoService.IV_LENGTH,
      DocumentCryptoService.IV_LENGTH + DocumentCryptoService.AUTH_TAG_LENGTH,
    );
    const ciphertext = payload.subarray(DocumentCryptoService.IV_LENGTH + DocumentCryptoService.AUTH_TAG_LENGTH);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }
}
