import { EncryptJWT } from 'jose';
import {
  SESSION_COOKIE_NAME,
  clearSessionCookieOptions,
  decryptSession,
  encryptSession,
  getSession,
  getSessionEncryptionKey,
  sessionCookieOptions,
} from '../lib/auth/session';
import { SESSION_MAX_AGE_SECONDS } from '../lib/config';

/** process.env.NODE_ENV est readonly dans @types/node — helper pour les tests. */
function setNodeEnv(value: string | undefined): void {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

const SESSION = {
  sub: 'user-42',
  email: 'admin@goursi.app',
  name: 'Admin GOURSI',
  roles: ['SUPER_ADMIN', 'FINANCE_MANAGER'],
};

describe('session chiffrée (jose JWE)', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'test-session-secret-0123456789abcdef';
    setNodeEnv(undefined);
  });

  afterEach(() => {
    delete process.env.SESSION_SECRET;
    setNodeEnv(undefined);
  });

  it('round-trip : encryptSession puis decryptSession restitue sub, email, roles', async () => {
    const token = await encryptSession(SESSION);
    expect(token).not.toContain(SESSION.sub); // aucune donnée en clair

    const session = await decryptSession(token);
    expect(session).not.toBeNull();
    expect(session?.sub).toBe('user-42');
    expect(session?.email).toBe('admin@goursi.app');
    expect(session?.name).toBe('Admin GOURSI');
    expect(session?.roles).toEqual(['SUPER_ADMIN', 'FINANCE_MANAGER']);
    expect(session?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('getSession renvoie null sans cookie (ou vide)', async () => {
    expect(await getSession(undefined)).toBeNull();
    expect(await getSession(null)).toBeNull();
    expect(await getSession('')).toBeNull();
  });

  it('rejette un jeton trafiqué (intégrité du chiffrement)', async () => {
    const token = await encryptSession(SESSION);
    const tampered = token.slice(0, -4) + (token.endsWith('AAAA') ? 'BBBB' : 'AAAA');
    expect(tampered).not.toBe(token);
    expect(await decryptSession(tampered)).toBeNull();
  });

  it('rejette un jeton expiré', async () => {
    const key = await getSessionEncryptionKey();
    const past = Math.floor(Date.now() / 1000) - 60;
    const expiredToken = await new EncryptJWT({ sub: 'x', roles: [] })
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
      .setIssuer('goursi-web-admin')
      .setAudience('goursi-web-admin')
      .setIssuedAt(past - 120)
      .setExpirationTime(past)
      .encrypt(key);
    expect(await decryptSession(expiredToken)).toBeNull();
  });

  it('rejette un jeton chiffré avec une autre clé (SESSION_SECRET différent)', async () => {
    const token = await encryptSession(SESSION);
    process.env.SESSION_SECRET = 'autre-secret-totalement-different-0123456789';
    expect(await decryptSession(token)).toBeNull();
  });

  it('rejette un payload sans sub ou sans roles', async () => {
    const key = await getSessionEncryptionKey();
    const noRoles = await new EncryptJWT({ sub: 'x' })
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
      .setIssuer('goursi-web-admin')
      .setAudience('goursi-web-admin')
      .setIssuedAt()
      .setExpirationTime('10m')
      .encrypt(key);
    expect(await decryptSession(noRoles)).toBeNull();
  });
});

describe('cookie de session', () => {
  beforeEach(() => {
    setNodeEnv(undefined);
  });

  afterEach(() => {
    setNodeEnv(undefined);
  });

  it('nom du cookie : goursi_admin_session', () => {
    expect(SESSION_COOKIE_NAME).toBe('goursi_admin_session');
  });

  it('sessionCookieOptions : HttpOnly, SameSite=Lax, Path=/, non Secure en dev', () => {
    const options = sessionCookieOptions();
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe('lax');
    expect(options.path).toBe('/');
    expect(options.secure).toBe(false);
    expect(options.maxAge).toBe(SESSION_MAX_AGE_SECONDS);
  });

  it('sessionCookieOptions : Secure en production', () => {
    setNodeEnv('production');
    expect(sessionCookieOptions().secure).toBe(true);
    expect(clearSessionCookieOptions().maxAge).toBe(0);
  });
});
