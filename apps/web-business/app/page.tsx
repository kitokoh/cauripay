/**
 * Page racine — point d'entrée de l'espace entreprise.
 * Le middleware 2FA protège déjà l'accès (pas de session → /login) ; une
 * session validée est dirigée vers /dashboard (groupe (dashboard), sidebar).
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { readSession } from '../lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await readSession(cookies().get('goursi_business_session')?.value);
  if (!session) {
    redirect('/login');
  }
  redirect('/dashboard');
}
