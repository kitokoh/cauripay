import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware — aucune route métier accessible sans session 2FA vérifiée.
 * La session porte `twoFactorVerified: true` uniquement après POST /api/auth/2fa.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }
  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  const session = request.cookies.get('business_session');
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  try {
    const parsed = JSON.parse(session.value);
    if (!parsed.twoFactorVerified) {
      return NextResponse.redirect(new URL('/login?2fa=1', request.url));
    }
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
