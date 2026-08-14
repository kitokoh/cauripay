import { TwoFactorService } from './two-factor';
import { authenticator } from 'otplib';

describe('TwoFactorService (2FA TOTP obligatoire)', () => {
  let svc: TwoFactorService;

  beforeEach(() => {
    svc = new TwoFactorService();
  });

  it('refuse un code vide ou malformé', () => {
    expect(svc.verify('SECRET', '')).toBe(false);
    expect(svc.verify('SECRET', '12345')).toBe(false);
    expect(svc.verify('SECRET', 'abcdef')).toBe(false);
    expect(svc.verify('', '123456')).toBe(false);
  });

  it('accepte un code TOTP valide généré avec le même secret', () => {
    const { secret } = svc.generateSecret('membre@entreprise.com');
    // otplib : génération + vérification cohérentes (fenêtre standard 30 s)
    const code = authenticator.generate(secret);
    expect(svc.verify(secret, code)).toBe(true);
  });

  it('refuse un code d’un autre secret', () => {
    const a = svc.generateSecret('a@x.com').secret;
    const b = svc.generateSecret('b@x.com').secret;
    const code = authenticator.generate(b);
    expect(svc.verify(a, code)).toBe(false);
  });

  it('génère une otpauthUrl exploitable par une app d’auth', () => {
    const { otpauthUrl } = svc.generateSecret('membre@entreprise.com');
    expect(otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
    expect(otpauthUrl).toContain('CauriPay');
  });
});
