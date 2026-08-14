/**
 * Middleware web-admin — garde d'authentification + RBAC par section.
 *
 * - Pas de session → redirection /login (sauf /login, /forbidden) ;
 * - session → contrôle RBAC (canAccess) → sinon redirection /forbidden (403) ;
 * - `/` laissé à app/page.tsx (redirige vers /login ou /dashboard) ;
 * - les routes /api/auth/* et les assets statiques sont exclus (matcher).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { canAccess } from './lib/auth/rbac';
import { getSession } from './lib/auth/session';
import { SESSION_COOKIE_NAME } from './lib/config';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = await getSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  // Non authentifié : seuls login/forbidden restent accessibles.
  if (!session) {
    if (pathname === '/login' || pathname === '/forbidden') {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/login', request.nextUrl.origin));
  }

  // Authentifié : /login n'a plus de sens.
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.nextUrl.origin));
  }

  // Routes gérées par leurs pages (redirection racine, page 403).
  if (pathname === '/' || pathname === '/forbidden') {
    return NextResponse.next();
  }

  // RBAC par section (fail-closed : chemin inconnu → 403).
  if (!canAccess(session.roles, pathname)) {
    return NextResponse.redirect(new URL('/forbidden', request.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Tout sauf :
     * - /api/auth/* (route handlers OIDC : login/callback/logout) ;
     * - assets Next (_next/static, _next/image) ;
     * - fichiers statiques (favicon, images, polices…).
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|woff2?)$).*)',
  ],
};
