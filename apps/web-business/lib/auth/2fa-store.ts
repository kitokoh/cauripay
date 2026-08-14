/**
 * 2FA store — secret TOTP par utilisateur (GOURSI-043a).
 *
 * Implémentation de DÉMONSTRATION : Map en mémoire + persistance dans un fichier
 * JSON local (`<app>/data/2fa.json`, gitignoré) pour ne pas perdre les secrets
 * entre deux redémarrages en dev.
 *
 * ⚠ PRODUCTION : remplacer par un service dédié / une base de données
 * (ex. table chiffrée dans le store utilisateur de business-service, ou un
 * service 2FA) — ce module n'est PAS un stockage sécurisé de secrets.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_STORE_FILE = path.join(process.cwd(), 'data', '2fa.json');

export class TwoFactorStore {
  private readonly secrets = new Map<string, string>();
  private loaded = false;

  constructor(private readonly filePath: string = DEFAULT_STORE_FILE) {}

  /** Lazy-load du fichier JSON au premier accès. */
  private load(): void {
    if (this.loaded) {
      return;
    }
    this.loaded = true;
    try {
      const raw = readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, string>;
      for (const [userId, secret] of Object.entries(parsed)) {
        this.secrets.set(userId, secret);
      }
    } catch {
      // fichier absent ou corrompu → store vide (écriture de rechange à la 1re inscription)
    }
  }

  /** Persistance du fichier JSON (créé si besoin). */
  private persist(): void {
    mkdirSync(path.dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(Object.fromEntries(this.secrets), null, 2), 'utf8');
  }

  /** L'utilisateur a-t-il un secret 2FA enregistré ? */
  isEnrolled(userId: string): boolean {
    this.load();
    return this.secrets.has(userId);
  }

  /** Secret TOTP de l'utilisateur, ou null s'il n'est pas enrôlé. */
  getSecret(userId: string): string | null {
    this.load();
    return this.secrets.get(userId) ?? null;
  }

  /** Enregistre (ou remplace) le secret TOTP d'un utilisateur. */
  setSecret(userId: string, secret: string): void {
    this.load();
    this.secrets.set(userId, secret);
    this.persist();
  }
}

/** Store singleton utilisé par les route handlers. */
export const twoFactorStore = new TwoFactorStore();

/** Factory pour les tests (store isolé sur un fichier temporaire). */
export function createTwoFactorStore(filePath: string): TwoFactorStore {
  return new TwoFactorStore(filePath);
}
