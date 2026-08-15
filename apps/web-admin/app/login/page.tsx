import Link from 'next/link';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { denied?: string; error?: string };
}) {
  return (
    <div
      style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#F6F7F9' }}
    >
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <h1>CauriPay Admin</h1>
        <p>Back-office — connexion via Keycloak (OIDC).</p>
        {searchParams.denied && (
          <p style={{ color: '#dc2626' }}>
            ⛔ Rôle insuffisant : votre compte ne peut pas accéder à cette section.
          </p>
        )}
        {searchParams.error && <p style={{ color: '#dc2626' }}>Erreur d'authentification.</p>}
        <Link
          href="/api/auth/login"
          style={{
            display: 'inline-block',
            marginTop: 16,
            padding: '12px 24px',
            background: '#0E9F6E',
            color: '#fff',
            borderRadius: 8,
            textDecoration: 'none',
          }}
        >
          Se connecter (Keycloak)
        </Link>
      </div>
    </div>
  );
}
