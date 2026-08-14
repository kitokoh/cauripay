/**
 * Middleware 2FA — fonction PURE de décision (GOURSI-043a).
 *
 * C'est la preuve du critère « sans 2FA, AUCUNE route n'est accessible » :
 * le middleware Next.js applique cette décision à chaque requête (hors assets
 * et routes /api/*).
 *
 * Règles :
 *  - pas de session                              → 'login'  (→ /login)
 *  - session 2FA validée                         → 'ok'     (accès autorisé)
 *  - session enrôlée mais 2FA non validée        → 'verify' (→ /verify-2fa)
 *  - session non enrôlée (1er login)             → 'setup'  (→ /setup-2fa)
 *
 * Les pages /setup-2fa et /verify-2fa renvoient 'ok' pour l'état qui les
 * concerne, afin d'éviter les boucles de redirection.
 */
export type TwoFactorDecision = 'ok' | 'setup' | 'verify' | 'login';

export interface TwoFactorSessionLike {
  twoFactorEnrolled: boolean;
  twoFactorVerified: boolean;
}

export function requireTwoFactor(
  session: TwoFactorSessionLike | null,
  pathname: string,
): TwoFactorDecision {
  if (!session) {
    // /login est la page publique d'entrée — pas de boucle de redirection
    return pathname === '/login' ? 'ok' : 'login';
  }
  if (session.twoFactorVerified) {
    return 'ok';
  }
  if (!session.twoFactorEnrolled) {
    return pathname === '/setup-2fa' ? 'ok' : 'setup';
  }
  return pathname === '/verify-2fa' ? 'ok' : 'verify';
}
