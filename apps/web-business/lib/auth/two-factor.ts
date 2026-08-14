/**
 * 2FA TOTP — fonctions pures (GOURSI-043a).
 *
 * Basé sur otplib v12 (RFC 6238, TOTP 30 s, 6 chiffres, SHA-1).
 *
 * ⚠ Spécificité otplib v12 : `authenticator.verify({ token, secret, window })`
 * IGNORE l'option `window` passée par appel — la fenêtre est lue sur les options
 * de l'instance (`authenticator.options`). On configure donc la fenêtre une fois
 * au chargement du module ; `verifyTotp` reste une fonction pure du point de vue
 * de l'appelant (secret + token → booléen, aucun état modifié).
 */
import { authenticator } from 'otplib';

/** Émetteur affiché dans l'app d'authentification (Google Authenticator, …). */
export const TOTP_ISSUER = 'GOURSI Business';

/** Nombre de pas de temps (30 s) acceptés de part et d'autre du pas courant. */
export const TOTP_WINDOW = 1;

// Configuration de l'instance otplib (cf. note ci-dessus).
authenticator.options = { window: TOTP_WINDOW };

/**
 * Génère un secret TOTP aléatoire au format Base32 (défaut otplib : 10 octets
 * aléatoires → 16 caractères Base32).
 */
export function generateSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Construit l'URI otpauth:// affichée en QR code.
 * @param secret secret Base32 généré par {@link generateSecret}
 * @param email compte associé (ex. email du user Keycloak)
 */
export function generateTotpUri(secret: string, email: string): string {
  return authenticator.keyuri(email, TOTP_ISSUER, secret);
}

/**
 * Vérifie un code TOTP saisi par l'utilisateur.
 * Tolérance de fenêtre : {@link TOTP_WINDOW} pas (± 30 s) autour du pas courant.
 *
 * @returns true si le code est valide (période courante ou fenêtre ±1 pas).
 */
export function verifyTotp(secret: string, token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }
  try {
    return authenticator.verify({ token, secret });
  } catch {
    // secret invalide / token malformé → refus silencieux
    return false;
  }
}
