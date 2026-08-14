/**
 * Helpers cookie de session (GOURSI-043a).
 * Options communes : httpOnly (inaccessible au JS), sameSite=lax, secure en
 * production, path=/ (valable sur toutes les routes de l'app).
 */
import type { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from './session';

const SESSION_MAX_AGE_S = 8 * 60 * 60; // 8 h (aligné sur SESSION_MAX_AGE_H)

export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_S,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
