import { NextRequest, NextResponse } from 'next/server';
import { Issuer } from 'openid-client';

/** GET /api/auth/callback — échange le code ; session SANS 2FA (étape suivante obligatoire). */
export async function GET(request: NextRequest) {
  const issuer = await Issuer.discover(
    process.env.KEYCLOAK_URL
      ? `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM ?? 'goursi'}`
      : 'http://localhost:8080/realms/goursi',
  );
  const client = new issuer.Client({
    client_id: process.env.KEYCLOAK_CLIENT_ID ?? 'web-business',
    client_secret: process.env.KEYCLOAK_CLIENT_SECRET ?? '',
    redirect_uris: [
      process.env.WEB_BUSINESS_REDIRECT_URI ?? 'http://localhost:3002/api/auth/callback',
    ],
    response_types: ['code'],
  });
  try {
    const params = client.callbackParams(request.nextUrl.toString());
    const state = request.cookies.get('oidc_state')?.value;
    const tokenSet = await client.callback(
      process.env.WEB_BUSINESS_REDIRECT_URI ?? 'http://localhost:3002/api/auth/callback',
      params,
      { state },
    );
    const claims = tokenSet.claims();
    const session = {
      sub: claims.sub,
      email: (claims as { email?: string }).email ?? '',
      twoFactorVerified: false, // ← obligatoire avant toute route métier
    };
    const res = NextResponse.redirect(new URL('/login?2fa=1', request.url));
    res.cookies.set('business_session', JSON.stringify(session), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
    });
    return res;
  } catch {
    return NextResponse.redirect(new URL('/login?error=1', request.url));
  }
}
