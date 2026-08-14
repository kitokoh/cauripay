/**
 * Page racine — garde de session :
 * - pas de session → /login ;
 * - session valide → /dashboard (overview).
 * (Le middleware fait déjà la redirection ; ce garde est la deuxième couche.)
 */
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from '../lib/config';
import { getSession } from '../lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getSession(cookies().get(SESSION_COOKIE_NAME)?.value);
  redirect(session ? '/dashboard' : '/login');
}
