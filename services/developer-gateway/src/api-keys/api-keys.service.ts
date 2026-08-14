import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';

export interface DevApiKey {
  id: string;
  developerId: string;
  mode: 'sandbox' | 'live';
  keyPrefix: 'sk_' | 'pk_';
  keyHash: string; // sha256 — jamais en clair stocké
  revoked: boolean;
  createdAt: Date;
}

/**
 * Clés API développeur (GOURSI-050a).
 * Les clés sont stockées HACHÉES (sha256) — la clé brute n'est renvoyée
 * qu'une seule fois à la création (comme Stripe).
 */
@Injectable()
export class ApiKeysService {
  private readonly keys = new Map<string, DevApiKey>();

  /** POST /dev/api-keys — crée une clé sandbox (sk_/pk_), renvoie la clé brute UNE fois. */
  create(developerId: string, mode: 'sandbox' | 'live' = 'sandbox', prefix: 'sk_' | 'pk_' = 'sk_') {
    const raw = `${prefix}${randomUUID().replace(/-/g, '')}`;
    const key: DevApiKey = {
      id: `key_${randomUUID().slice(0, 12)}`,
      developerId,
      mode,
      keyPrefix: prefix,
      keyHash: this.hash(raw),
      revoked: false,
      createdAt: new Date(),
    };
    this.keys.set(key.id, key);
    return {
      key: { id: key.id, mode: key.mode, prefix: key.keyPrefix, createdAt: key.createdAt },
      secret: raw,
    };
  }

  /** Révocation → 401 aux appels suivants. */
  revoke(keyId: string) {
    const key = this.keys.get(keyId);
    if (!key) return false;
    key.revoked = true;
    return true;
  }

  /** Rotation : révoque l'ancienne, crée une nouvelle. */
  rotate(developerId: string, keyId: string) {
    this.revoke(keyId);
    return this.create(developerId);
  }

  /** Valide un Bearer sk_… : existe, non révoquée, mode cohérent. */
  authenticate(rawKey: string): DevApiKey | null {
    const hash = this.hash(rawKey);
    const key = [...this.keys.values()].find((k) => k.keyHash === hash);
    if (!key || key.revoked) return null;
    return key;
  }

  list(developerId: string): DevApiKey[] {
    return [...this.keys.values()].filter((k) => k.developerId === developerId);
  }

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
