import { useEffect, useState } from 'react';
import { request, type Merchant } from '../api';
import { PageHead } from '../components/Layout';
import { Spinner } from '../components/StatCard';
import { toast } from '../components/Toast';

export function SettingsPage(): JSX.Element {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    request<{ merchant: Merchant }>('/auth/me').then((r) => {
      setMerchant(r.merchant);
      setName(r.merchant.name);
      setCompany(r.merchant.company);
    });
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await request('/auth/me', { method: 'PATCH', body: { name, company } });
      toast('success', 'Profil mis à jour.');
    } catch (err) {
      setErr(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await request('/auth/me', { method: 'PATCH', body: { password: next, password_current: cur } });
      setCur('');
      setNext('');
      toast('success', 'Mot de passe mis à jour.');
    } catch (err) {
      setErr(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  if (!merchant) return <Spinner />;

  return (
    <>
      <PageHead title="Réglages" sub="Profil du compte marchand." />
      {err && <div className="error-box">{err}</div>}
      <div className="settings-grid">
        <form className="card" onSubmit={saveProfile}>
          <h3 className="card-title">Profil</h3>
          <label>Nom</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
          <label>Entreprise</label>
          <input value={company} onChange={(e) => setCompany(e.target.value)} />
          <label>Email</label>
          <input value={merchant.email} disabled className="input-disabled" />
          <div className="form-actions">
            <button className="btn btn-primary" disabled={busy}>Enregistrer</button>
          </div>
        </form>

        <form className="card" onSubmit={savePassword}>
          <h3 className="card-title">Mot de passe</h3>
          <label>Mot de passe actuel</label>
          <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} required />
          <label>Nouveau mot de passe (8 min.)</label>
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} required />
          <div className="form-actions">
            <button className="btn btn-primary" disabled={busy}>Changer le mot de passe</button>
          </div>
        </form>
      </div>
    </>
  );
}
