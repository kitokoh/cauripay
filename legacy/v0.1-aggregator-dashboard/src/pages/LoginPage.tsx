import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { request, setToken } from '../api';
import { toast } from '../components/Toast';

export function AuthShell({ children, title, sub }: { children: JSX.Element; title: string; sub: string }): JSX.Element {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-logo big">C</div>
          <h1>CauriPay</h1>
          <p>Agrégateur de paiement pour développeurs — Afrique de l'Ouest & Centrale</p>
        </div>
        <h2>{title}</h2>
        <p className="auth-sub">{sub}</p>
        {children}
      </div>
    </div>
  );
}

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const res = await request<{ token: string }>('/auth/login', { method: 'POST', body: { email, password } });
      setToken(res.token);
      toast('success', 'Bienvenue sur CauriPay 👋');
      navigate('/app');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Connexion" sub="Accédez à votre tableau de bord marchand.">
      <form onSubmit={submit} className="form">
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="awa@entreprise.com" required />
        <label>Mot de passe</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
        {err && <div className="form-error">{err}</div>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</button>
        <p className="auth-link">Pas de compte ? <Link to="/register">Créer un compte marchand</Link></p>
      </form>
    </AuthShell>
  );
}
