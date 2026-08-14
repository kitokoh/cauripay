import { NextResponse } from 'next/server';

/** GET /api/auth/logout — détruit la session. */
export async function GET() {
  const res = NextResponse.redirect('/login');
  res.cookies.delete('admin_session');
  return res;
}
