import { NextRequest, NextResponse } from 'next/server';
import { getOidcClient } from '../../../../lib/auth/oidc';

/**
 * GET /api/auth/callback — échange le code contre des tokens, crée la session.
 * La session (httpOnly) contient sub, email, roles — jamais le refresh token.
 */
export async function GET(request: NextRequest) {
  const client = await getOidcClient();
  const params = client.callbackParams(request.nextUrl.toString());
  const state = request.cookies.get('oidc_state')?.value;
  const nonce = request.cookies.get('oidc_nonce')?.value;

  try {
    const tokenSet = await client.callback(
      process.env.WEB_ADMIN_REDIRECT_URI ?? 'http://localhost:3001/api/auth/callback',
      params,
      { state, nonce },
    );
    const claims = tokenSet.claims();
    const roles: string[] =
      (claims as { realm_access?: { roles?: string[] } }).realm_access?.roles ?? [];

    const session = {
      sub: claims.sub,
      email: (claims as { email?: string }).email ?? '',
      roles,
      accessToken: tokenSet.access_token ?? '',
    };

    const next = request.nextUrl.searchParams.get('state') // (utilisé si fourni)
      ? '/dashboard'
      : '/dashboard';
    const res = NextResponse.redirect(new URL(next, request.url));
    res.cookies.set('admin_session', JSON.stringify(session), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 h
    });
    return res;
  } catch {
    return NextResponse.redirect(new URL('/login?error=1', request.url));
  }
}
export const dynamic = 'force-dynamic';
