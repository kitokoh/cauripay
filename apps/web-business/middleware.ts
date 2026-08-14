/**
 * Middleware — GOURSI-043a : « sans 2FA, AUCUNE route n'est accessible ».
 *
 * Chaque requête (hors assets statiques et routes /api/*) est filtrée :
 *  - pas de session                          → redirection /login
 *  - session 2FA non validée (non enrôlée)   → redirection /setup-2fa
 *  - session 2FA non validée (enrôlée)       → redirection /verify-2fa
 *  - session 2FA validée                     → accès autorisé
 *
 * La décision est déléguée à la fonction PURE requireTwoFactor
 * (lib/auth/middleware-logic.ts, unit-testée). Le JWT de session est vérifié
 * ici avec jose (compatible runtime Edge — aucun module Node importé).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { requireTwoFactor } from './lib/auth/middleware-logic';
import { readSession, SESSION_COOKIE_NAME } from './lib/auth/session';

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const session = await readSession(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  const decision = requireTwoFactor(session, req.nextUrl.pathname);

  switch (decision) {
    case 'login':
      return NextResponse.redirect(new URL('/login', req.url));
    case 'setup':
      return NextResponse.redirect(new URL('/setup-2fa', req.url));
    case 'verify':
      return NextResponse.redirect(new URL('/verify-2fa', req.url));
    case 'ok':
    default:
      return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // Toutes les routes sauf : API, assets Next, fichiers statiques
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
