import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * Chiffrement AES-256-GCM des documents KYC (GOURSI-024a).
 * Format au repos : `iv:authTag:ciphertext` (base64) — jamais de document en clair.
 * La clé vient de KYC_ENCRYPTION_KEY (≥ 32 octets), par environnement, jamais commitée.
 */
@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const raw = config.get<string>('env.kycEncryptionKey');
    if (!raw || Buffer.byteLength(raw, 'utf8') < 32) {
      throw new Error('KYC_ENCRYPTION_KEY manquante ou < 32 octets — refus de démarrer');
    }
    // La clé AES-256 doit faire exactement 32 octets : on hache la valeur en SHA-256.
    this.key = createHash32(raw);
  }

  /** Chiffre un document (base64 entrant) → `iv:tag:cipher` (base64). */
  encrypt(plainBase64: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGO, this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(Buffer.from(plainBase64, 'base64')),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(':');
  }

  /** Déchiffre `iv:tag:cipher` → base64 d'origine. Lève une erreur si l'intégrité est rompue. */
  decrypt(payload: string): string {
    const [ivB64, tagB64, cipherB64] = payload.split(':');
    if (!ivB64 || !tagB64 || !cipherB64) {
      throw new Error('Payload chiffré invalide');
    }
    const decipher = createDecipheriv(ALGO, this.key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(cipherB64, 'base64')),
      decipher.final(),
    ]);
    return plain.toString('base64');
  }
}

function createHash32(raw: string): Buffer {
  return createHash('sha256').update(raw, 'utf8').digest();
}
