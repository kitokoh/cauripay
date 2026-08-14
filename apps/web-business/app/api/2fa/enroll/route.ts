/**
 * POST /api/2fa/enroll — 1er login : enrôlement du secret TOTP affiché en QR.
 *
 * Corps attendu : { token: "<code TOTP 6 chiffres>" }
 * Le code est vérifié contre le secret PROVISOIRE embarqué dans la session
 * (pending2faSecret, généré au callback OIDC). En cas de succès le secret est
 * persisté (2fa-store) et la session passe à twoFactorEnrolled=true,
 * twoFactorVerified=true → redirection /.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { twoFactorStore } from '../../../../lib/auth/2fa-store';
import { setSessionCookie } from '../../../../lib/auth/cookies';
import { createSession, readSession, SESSION_COOKIE_NAME } from '../../../../lib/auth/session';
import { verifyTotp } from '../../../../lib/auth/two-factor';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await readSession(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ error: 'non_authentifie' }, { status: 401 });
  }
  if (session.twoFactorEnrolled) {
    return NextResponse.json({ error: 'deja_enrole' }, { status: 409 });
  }
  if (!session.pending2faSecret) {
    return NextResponse.json({ error: 'aucun_secret_en_attente' }, { status: 409 });
  }

  let token = '';
  try {
    const body = (await req.json()) as { token?: unknown };
    token = typeof body.token === 'string' ? body.token.trim() : '';
  } catch {
    return NextResponse.json({ error: 'corps_invalide' }, { status: 400 });
  }

  if (!verifyTotp(session.pending2faSecret, token)) {
    return NextResponse.json({ error: 'code_invalide' }, { status: 400 });
  }

  // Enrôlement persistant + session 2FA validée
  twoFactorStore.setSecret(session.sub, session.pending2faSecret);
  const verifiedSession = await createSession({
    ...session,
    twoFactorEnrolled: true,
    twoFactorVerified: true,
    pending2faSecret: undefined,
  });

  const res = NextResponse.json({ ok: true, redirectTo: '/' });
  setSessionCookie(res, verifiedSession);
  return res;
}
