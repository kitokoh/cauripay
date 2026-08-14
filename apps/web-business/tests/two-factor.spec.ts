/**
 * Tests unitaires — 2FA TOTP (GOURSI-043a).
 * Couvre : format du secret (Base32), unicité, URI otpauth, vérification
 * code correct / incorrect / fenêtre expirée (window ±1 pas de 30 s).
 */
import { authenticator } from 'otplib';
import { generateSecret, generateTotpUri, TOTP_ISSUER, verifyTotp } from '../lib/auth/two-factor';

describe('lib/auth/two-factor', () => {
  describe('generateSecret', () => {
    it('génère un secret au format Base32 (alphabet A-Z, 2-7)', () => {
      const secret = generateSecret();
      expect(secret).toMatch(/^[A-Z2-7]{16,}$/);
    });

    it('génère un secret différent à chaque appel (aléatoire)', () => {
      const a = generateSecret();
      const b = generateSecret();
      expect(a).not.toBe(b);
    });

    it('génère un secret utilisable par otplib (URI valide)', () => {
      const secret = generateSecret();
      expect(() => authenticator.keyuri('u@example.com', TOTP_ISSUER, secret)).not.toThrow();
    });
  });

  describe('generateTotpUri', () => {
    it('produit une URI otpauth://totp avec secret, issuer et compte', () => {
      const secret = generateSecret();
      const uri = generateTotpUri(secret, 'acme@example.com');

      expect(uri.startsWith('otpauth://totp/')).toBe(true);
      expect(uri).toContain(`secret=${secret}`);
      expect(uri).toContain(`issuer=${encodeURIComponent(TOTP_ISSUER)}`);
      expect(uri).toContain(encodeURIComponent('acme@example.com'));
      expect(uri).toContain('period=30');
    });
  });

  describe('verifyTotp', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-08-14T12:00:00.000Z'));
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    const secret = generateSecret();
    const T0 = new Date('2026-08-14T12:00:00.000Z').getTime();

    it('accepte le code TOTP courant', () => {
      const token = authenticator.generate(secret); // généré à T0
      expect(verifyTotp(secret, token)).toBe(true);
    });

    it('rejette un code incorrect', () => {
      expect(verifyTotp(secret, '000000')).toBe(false);
      expect(verifyTotp(secret, '')).toBe(false);
    });

    it('accepte un code de la fenêtre (±1 pas = 30 s)', () => {
      const token = authenticator.generate(secret); // T0
      // 30 s avant → pas -1 (dans la fenêtre)
      jest.setSystemTime(T0 - 30_000);
      expect(verifyTotp(secret, token)).toBe(true);
      // 30 s après → pas +1 (dans la fenêtre)
      jest.setSystemTime(T0 + 30_000);
      expect(verifyTotp(secret, token)).toBe(true);
    });

    it('rejette un code hors fenêtre (expiré, > ±1 pas)', () => {
      const token = authenticator.generate(secret); // T0
      // 90 s avant → pas -3 (hors fenêtre)
      jest.setSystemTime(T0 - 90_000);
      expect(verifyTotp(secret, token)).toBe(false);
      // 120 s après → pas +4 (hors fenêtre)
      jest.setSystemTime(T0 + 120_000);
      expect(verifyTotp(secret, token)).toBe(false);
    });

    it('ne lève pas et rejette sur secret invalide', () => {
      expect(verifyTotp('!!not-base32!!', '123456')).toBe(false);
    });
  });
});
