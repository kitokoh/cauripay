import { NextResponse } from 'next/server';
export async function GET() {
  const res = NextResponse.redirect('/login');
  res.cookies.delete('business_session');
  return res;
}
export const dynamic = 'force-dynamic';
