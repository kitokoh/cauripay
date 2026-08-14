/**
 * Tests unitaires — décision du middleware 2FA (GOURSI-043a).
 * requireTwoFactor(session, pathname) → 'ok' | 'setup' | 'verify' | 'login'.
 * C'est la fonction qui prouve « sans 2FA, aucune route n'est accessible ».
 */
import { requireTwoFactor } from '../lib/auth/middleware-logic';

describe('lib/auth/middleware-logic — requireTwoFactor', () => {
  const enrolledSession = { twoFactorEnrolled: true, twoFactorVerified: false };
  const verifiedSession = { twoFactorEnrolled: true, twoFactorVerified: true };
  const unenrolledSession = { twoFactorEnrolled: false, twoFactorVerified: false };

  it('sans session → "login" (redirection /login)', () => {
    expect(requireTwoFactor(null, '/payments')).toBe('login');
    expect(requireTwoFactor(null, '/dashboard')).toBe('login');
  });

  it('page /login : pas de boucle — autorisée sans session', () => {
    expect(requireTwoFactor(null, '/login')).toBe('ok');
  });

  it('session 2FA validée → "ok" (accès autorisé), quelle que soit la route', () => {
    expect(requireTwoFactor(verifiedSession, '/payments')).toBe('ok');
    expect(requireTwoFactor(verifiedSession, '/bulk')).toBe('ok');
    expect(requireTwoFactor(verifiedSession, '/')).toBe('ok');
  });

  it('session enrôlée mais 2FA non validée → "verify" (redirection /verify-2fa)', () => {
    expect(requireTwoFactor(enrolledSession, '/payments')).toBe('verify');
    expect(requireTwoFactor(enrolledSession, '/dashboard')).toBe('verify');
    expect(requireTwoFactor(enrolledSession, '/reports')).toBe('verify');
  });

  it('session non enrôlée (1er login) → "setup" (redirection /setup-2fa)', () => {
    expect(requireTwoFactor(unenrolledSession, '/payments')).toBe('setup');
    expect(requireTwoFactor(unenrolledSession, '/dashboard')).toBe('setup');
  });

  it('page /verify-2fa : pas de boucle — autorisée pour une session enrôlée non validée', () => {
    expect(requireTwoFactor(enrolledSession, '/verify-2fa')).toBe('ok');
  });

  it('page /setup-2fa : pas de boucle — autorisée pour une session non enrôlée', () => {
    expect(requireTwoFactor(unenrolledSession, '/setup-2fa')).toBe('ok');
  });

  it('une session non enrôlée n\'accède JAMAIS à une route protégée', () => {
    for (const path of ['/payments', '/bulk', '/reports', '/settings', '/dashboard', '/']) {
      expect(requireTwoFactor(unenrolledSession, path)).toBe('setup');
    }
  });

  it('une session enrôlée non validée n\'accède JAMAIS à une route protégée', () => {
    for (const path of ['/payments', '/bulk', '/reports', '/settings', '/dashboard', '/']) {
      expect(requireTwoFactor(enrolledSession, path)).toBe('verify');
    }
  });
});
