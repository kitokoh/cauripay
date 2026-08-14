import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { request, setSkTest, setToken } from '../api';
import { toast } from '../components/Toast';
import { AuthShell } from './LoginPage';

export function RegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (password !== confirm) return setErr('Les mots de passe ne correspondent pas.');
    if (password.length < 8) return setErr('Mot de passe : 8 caractères minimum.');
    setBusy(true);
    try {
      const res = await request<{ token: string; keys?: { secret_test?: string } }>('/auth/register', { method: 'POST', body: { name, company, email, password } });
      setToken(res.token);
      if (res.keys?.secret_test) setSkTest(res.keys.secret_test);
      toast('success', 'Compte créé — bienvenue ! Vos clés API de test ont été copiées en local (affichées une seule fois).');
      navigate('/app');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Créer un compte marchand" sub="Gratuit. Mode test immédiat, aucune carte requise.">
      <form onSubmit={submit} className="form">
        <label>Nom</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Awa Diallo" required />
        <label>Entreprise</label>
        <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Kora Labs" />
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="awa@entreprise.com" required />
        <label>Mot de passe</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères min." required />
        <label>Confirmation</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" required />
        {err && <div className="form-error">{err}</div>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Création…' : 'Créer mon compte'}</button>
        <p className="auth-link">Déjà inscrit ? <Link to="/login">Se connecter</Link></p>
      </form>
    </AuthShell>
  );
}
