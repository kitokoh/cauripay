/**
 * Tests unitaires — session JWT (GOURSI-043a).
 * Aller-retour createSession/readSession, cookie invalide, token altéré,
 * expiration, secret différent.
 */
import {
  createSession,
  readSession,
  SESSION_AUDIENCE,
  SESSION_ISSUER,
  type SessionUser,
} from '../lib/auth/session';

const TEST_SECRET = 'test-session-secret-0123456789abcdef';

function user(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    sub: 'user-1',
    email: 'acme@example.com',
    name: 'ACME SARL',
    roles: ['merchant'],
    twoFactorEnrolled: true,
    twoFactorVerified: true,
    ...overrides,
  };
}

describe('lib/auth/session', () => {
  it('aller-retour : createSession → readSession restitue le payload', async () => {
    const token = await createSession(user(), { secret: TEST_SECRET });
    const session = await readSession(token, { secret: TEST_SECRET });

    expect(session).not.toBeNull();
    expect(session?.sub).toBe('user-1');
    expect(session?.email).toBe('acme@example.com');
    expect(session?.roles).toEqual(['merchant']);
    expect(session?.twoFactorEnrolled).toBe(true);
    expect(session?.twoFactorVerified).toBe(true);
  });

  it('2FA non validée : le flag twoFactorVerified=false est conservé (blocage middleware)', async () => {
    const token = await createSession(user({ twoFactorVerified: false }), { secret: TEST_SECRET });
    const session = await readSession(token, { secret: TEST_SECRET });
    expect(session?.twoFactorVerified).toBe(false);
    expect(session?.twoFactorEnrolled).toBe(true);
  });

  it('cookie absent / vide / incohérent → null (jamais d\'exception)', async () => {
    expect(await readSession(null, { secret: TEST_SECRET })).toBeNull();
    expect(await readSession(undefined, { secret: TEST_SECRET })).toBeNull();
    expect(await readSession('', { secret: TEST_SECRET })).toBeNull();
    expect(await readSession('pas-un-jwt', { secret: TEST_SECRET })).toBeNull();
  });

  it('token altéré (signature invalide) → null', async () => {
    const token = await createSession(user(), { secret: TEST_SECRET });
    const tampered = token.slice(0, -4) + (token.endsWith('AAAA') ? 'BBBB' : 'AAAA');
    expect(tampered).not.toBe(token);
    expect(await readSession(tampered, { secret: TEST_SECRET })).toBeNull();
  });

  it('token signé avec un autre secret → null', async () => {
    const token = await createSession(user(), { secret: 'other-secret-0123456789abcdef' });
    expect(await readSession(token, { secret: TEST_SECRET })).toBeNull();
  });

  it('session expirée → null (currentDate après expiration)', async () => {
    const token = await createSession(user(), { secret: TEST_SECRET, expiresIn: '1h' });
    const later = new Date(Date.now() + 2 * 60 * 60 * 1000);
    expect(await readSession(token, { secret: TEST_SECRET, currentDate: later })).toBeNull();
    // … mais toujours valide dans la fenêtre d'expiration
    expect(await readSession(token, { secret: TEST_SECRET })).not.toBeNull();
  });

  it('le JWT porte les claims iss/aud attendus', async () => {
    const token = await createSession(user(), { secret: TEST_SECRET });
    const [, payloadB64] = token.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    expect(payload.iss).toBe(SESSION_ISSUER);
    expect(payload.aud).toBe(SESSION_AUDIENCE);
    expect(payload.exp).toBeDefined();
  });
});
