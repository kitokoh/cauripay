'use client';

/**
 * Formulaire de validation TOTP — login suivant (2FA déjà enrôlée).
 * POST /api/2fa/verify puis redirection vers /.
 */
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function VerifyTwoFactorForm() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const body = (await res.json()) as { ok?: boolean; redirectTo?: string; error?: string };
      if (res.ok && body.ok) {
        router.push(body.redirectTo ?? '/');
        router.refresh();
      } else {
        setError(
          body.error === 'code_invalide'
            ? 'Code invalide. Vérifiez votre application d’authentification et réessayez.'
            : 'La validation a échoué. Veuillez réessayer.',
        );
        setToken('');
      }
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <label htmlFor="totp-token">
        Code à 6 chiffres de votre application d’authentification
      </label>
      <input
        id="totp-token"
        name="token"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        required
        value={token}
        onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="••••••"
        autoFocus
      />
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn--block" disabled={submitting || token.length !== 6}>
        {submitting ? 'Vérification…' : 'Valider et accéder à l’espace'}
      </button>
    </form>
  );
}
