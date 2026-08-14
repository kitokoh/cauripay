/**
 * /verify-2fa — login suivant : saisie du code TOTP.
 *
 * Garde-fous côté serveur (le middleware fait déjà la porte d'entrée) :
 *  - session 2FA déjà validée → redirection /
 *  - session non enrôlée      → redirection /setup-2fa
 *  - pas de session           → /login (normalement intercepté par le middleware)
 */
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { readSession } from '../../lib/auth/session';
import VerifyTwoFactorForm from './two-factor-form';

export const metadata: Metadata = { title: 'Double authentification' };

export const dynamic = 'force-dynamic';

export default async function VerifyTwoFactorPage() {
  const session = await readSession(cookies().get('goursi_business_session')?.value);
  if (!session) {
    redirect('/login');
  }
  if (session.twoFactorVerified) {
    redirect('/');
  }
  if (!session.twoFactorEnrolled) {
    redirect('/setup-2fa');
  }

  return (
    <main className="auth">
      <h1 className="auth__title">Double authentification</h1>
      <p className="auth__hint">
        {session.email ? `${session.email} — ` : ''}
        saisissez le code à 6 chiffres généré par votre application
        d’authentification pour terminer la connexion.
      </p>
      <div className="card">
        <VerifyTwoFactorForm />
      </div>
    </main>
  );
}
