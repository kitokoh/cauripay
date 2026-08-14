import { NextRequest, NextResponse } from 'next/server';
import { TwoFactorService } from '../../../../lib/auth/two-factor';

/**
 * POST /api/auth/2fa — vérifie le code TOTP du membre (2FA obligatoire).
 * En phase 0, le secret provient d'une variable d'env par entreprise ;
 * en staging, d'une table membre_2fa (chiffrée).
 */
export async function POST(request: NextRequest) {
  const { code, secret } = (await request.json()) as { code: string; secret?: string };
  const effectiveSecret = secret ?? process.env.MEMBER_2FA_SECRET;

  if (!effectiveSecret) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_2FA_CONFIG', message: '2FA non configuré' } },
      { status: 500 },
    );
  }

  const ok = new TwoFactorService().verify(effectiveSecret, code);
  if (!ok) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_2FA', message: 'Code invalide' } },
      { status: 401 },
    );
  }

  // Marque la session 2FA vérifiée
  const session = request.cookies.get('business_session');
  let parsed: { sub?: string; email?: string } = {};
  if (session) {
    try {
      parsed = JSON.parse(session.value);
    } catch {
      /* ignore */
    }
  }
  const res = NextResponse.json({ success: true, data: { verified: true } });
  res.cookies.set('business_session', JSON.stringify({ ...parsed, twoFactorVerified: true }), {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
  });
  return res;
}
