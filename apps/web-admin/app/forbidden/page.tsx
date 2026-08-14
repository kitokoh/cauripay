import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Accès refusé',
};

export default function ForbiddenPage() {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>403 — Accès refusé</h1>
        <p>Votre rôle ne permet pas d&apos;accéder à cette section du back-office.</p>
        <p>
          <Link className="btn btn-primary" href="/dashboard">
            Retour au tableau de bord
          </Link>
        </p>
      </div>
    </main>
  );
}
