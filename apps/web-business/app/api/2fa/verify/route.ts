/**
 * POST /api/2fa/verify — login suivant : validation TOTP contre le secret
 * ENREGISTRÉ de l'utilisateur (2fa-store, clé = sub Keycloak).
 *
 * Corps attendu : { token: "<code TOTP 6 chiffres>" }
 * Succès → session.twoFactorVerified=true (JWT réémis) → redirection /.
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
  if (!session.twoFactorEnrolled) {
    return NextResponse.json({ error: 'non_enrole' }, { status: 409 });
  }

  const secret = twoFactorStore.getSecret(session.sub);
  if (!secret) {
    // Secret perdu côté serveur → l'utilisateur doit ré-enrôler
    return NextResponse.json({ error: 'secret_introuvable' }, { status: 409 });
  }

  let token = '';
  try {
    const body = (await req.json()) as { token?: unknown };
    token = typeof body.token === 'string' ? body.token.trim() : '';
  } catch {
    return NextResponse.json({ error: 'corps_invalide' }, { status: 400 });
  }

  if (!verifyTotp(secret, token)) {
    return NextResponse.json({ error: 'code_invalide' }, { status: 400 });
  }

  const verifiedSession = await createSession({ ...session, twoFactorVerified: true });

  const res = NextResponse.json({ ok: true, redirectTo: '/' });
  setSessionCookie(res, verifiedSession);
  return res;
}
