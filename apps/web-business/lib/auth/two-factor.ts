import { authenticator } from 'otplib';

/**
 * 2FA TOTP obligatoire (GOURSI-043a) — sans code 2FA vérifié, aucune route
 * métier n'est accessible.
 */
export class TwoFactorService {
  /** Vérifie un code TOTP à 6 chiffres contre le secret du membre. */
  verify(secret: string, code: string): boolean {
    if (!secret || !/^\d{6}$/.test(code)) return false;
    try {
      return authenticator.verify({ token: code, secret });
    } catch {
      return false;
    }
  }

  /** Génère un secret pour l'enrôlement (retourné UNE fois). */
  generateSecret(label: string): { secret: string; otpauthUrl: string } {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(label, 'CauriPay', secret);
    return { secret, otpauthUrl };
  }
}
