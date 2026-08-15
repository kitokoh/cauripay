'use client';
import { useState } from 'react';

/** Étape 2FA obligatoire — POST /api/auth/2fa puis redirection. */
export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; '2fa'?: string };
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/auth/2fa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (res.ok) {
      window.location.href = '/dashboard';
    } else {
      const json = await res.json();
      setError(json?.error?.message ?? 'Code invalide');
    }
  }

  return (
    <div
      style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#F6F7F9' }}
    >
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <h1>CauriPay Business</h1>
        <p>Portail entreprises — double authentification obligatoire.</p>
        {searchParams['2fa'] && (
          <p style={{ color: '#b45309' }}>🔐 Saisissez votre code 2FA pour continuer.</p>
        )}
        {searchParams.error && <p style={{ color: '#dc2626' }}>Erreur d'authentification.</p>}
        {error && <p style={{ color: '#dc2626' }}>{error}</p>}
        <form
          onSubmit={submit}
          style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code à 6 chiffres"
            inputMode="numeric"
            maxLength={6}
            style={{
              padding: 12,
              borderRadius: 8,
              border: '1px solid #d1d5db',
              textAlign: 'center',
              fontSize: 18,
              letterSpacing: 4,
            }}
          />
          <button
            type="submit"
            style={{
              padding: '12px 24px',
              background: '#0E9F6E',
              color: '#fff',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Vérifier
          </button>
        </form>
      </div>
    </div>
  );
}
