import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Connexion' };

const ERROR_MESSAGES: Record<string, string> = {
  oidc: 'Connexion annulée côté fournisseur d’identité.',
  invalid_state: 'Échange de session invalide (état non conforme). Veuillez réessayer.',
  oidc_exchange: 'L’échange avec le fournisseur d’identité a échoué. Veuillez réessayer.',
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const error = searchParams.error ? ERROR_MESSAGES[searchParams.error] : null;

  return (
    <main className="auth">
      <h1 className="auth__title">Portail entreprises</h1>
      <p className="auth__hint">
        Espace marchand CauriPay — connexion SSO (Keycloak) puis 2FA obligatoire.
      </p>

      {error ? (
        <div className="banner" role="alert">
          {error}
        </div>
      ) : null}

      <form className="form" action="/api/auth/login" method="get">
        <button type="submit" className="btn btn--block">
          Se connecter avec Keycloak
        </button>
      </form>

      <p className="muted" style={{ marginTop: '1.25rem', fontSize: '0.85rem' }}>
        La double authentification (TOTP) est obligatoire pour accéder à l’espace
        entreprise. Elle est activée lors de la première connexion.
      </p>
    </main>
  );
}
