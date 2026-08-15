import { NextRequest, NextResponse } from 'next/server';
import { canAccessSection } from './lib/auth/rbac';

/**
 * Middleware RBAC — protège /dashboard/* par section.
 * Un token CUSTOMER (sans rôle admin) → redirigé vers /login?denied=1.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Login & auth callbacks publics
  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Route non protégée
  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  // Session httpOnly côté serveur (cookie)
  const sessionCookie = request.cookies.get('admin_session');
  if (!sessionCookie) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  let session: { roles: string[] };
  try {
    session = JSON.parse(sessionCookie.value);
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Section = premier segment après /dashboard/
  const section = pathname.split('/')[2] ?? 'overview';
  if (section === 'overview') return NextResponse.next(); // tout rôle admin OK

  if (!canAccessSection(section, session.roles)) {
    return NextResponse.redirect(new URL('/login?denied=1', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
