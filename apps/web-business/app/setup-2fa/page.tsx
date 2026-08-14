/**
 * /setup-2fa — 1er login : enrôlement TOTP obligatoire.
 *
 * Affiche le QR code (qrcode.toDataURL) + le secret provisoire de la session,
 * puis le formulaire de validation (POST /api/2fa/enroll).
 *
 * Garde-fous côté serveur :
 *  - pas de session (ou déjà validée / déjà enrôlée) → redirection adaptée.
 */
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { readSession } from '../../lib/auth/session';
import { generateTotpUri } from '../../lib/auth/two-factor';
import EnrollTwoFactorForm from './enroll-form';

export const metadata: Metadata = { title: 'Activer la double authentification' };

export const dynamic = 'force-dynamic';

export default async function SetupTwoFactorPage() {
  const session = await readSession(cookies().get('goursi_business_session')?.value);
  if (!session) {
    redirect('/login');
  }
  if (session.twoFactorVerified) {
    redirect('/');
  }
  if (session.twoFactorEnrolled) {
    redirect('/verify-2fa');
  }
  if (!session.pending2faSecret) {
    // Session sans secret provisoire : reconnexion nécessaire
    redirect('/login');
  }

  const secret = session.pending2faSecret;
  const email = session.email ?? session.sub;
  const uri = generateTotpUri(secret, email);
  const qrDataUrl = await QRCode.toDataURL(uri, { width: 220, margin: 1 });

  return (
    <main className="auth">
      <h1 className="auth__title">Activer la double authentification</h1>
      <p className="auth__hint">
        {email} — la 2FA est obligatoire pour accéder au portail entreprises.
      </p>

      <div className="card">
        <h2>1. Scannez le QR code</h2>
        <img className="qr" src={qrDataUrl} alt="QR code TOTP pour l'application d'authentification" width={220} height={220} />
        <p className="muted" style={{ fontSize: '0.9rem' }}>
          Avec Google Authenticator, FreeOTP ou toute application compatible TOTP.
        </p>

        <h2 style={{ marginTop: '1.25rem' }}>Clé manuelle (si le QR est illisible)</h2>
        <p>
          <code className="secret-code">{secret}</code>
        </p>
      </div>

      <div className="card">
        <h2>2. Confirmez avec un code</h2>
        <EnrollTwoFactorForm />
      </div>
    </main>
  );
}
