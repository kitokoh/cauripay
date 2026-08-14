import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Connexion',
};

export default function LoginPage({ searchParams }: { searchParams?: { error?: string } }) {
  const error = searchParams?.error;

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>GOURSI — Administration</h1>
        <p>Back-office sécurisé. Connectez-vous avec votre compte Keycloak.</p>
        {error ? <p className="auth-error">Connexion impossible : {error}</p> : null}
        <p>
          <a className="btn btn-primary" href="/api/auth/login">
            Se connecter avec Keycloak
          </a>
        </p>
      </div>
    </main>
  );
}
