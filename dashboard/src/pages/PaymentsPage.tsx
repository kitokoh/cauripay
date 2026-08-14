import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiV1, type Payment } from '../api';
import { CURRENCIES, METHODS, formatDate, formatMoney, shortId } from '../format';
import { PageHead } from '../components/Layout';
import { EmptyState, Spinner } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { toast } from '../components/Toast';

export function PaymentsPage(): JSX.Element {
  const [params, setParams] = useSearchParams();
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [status, setStatus] = useState(params.get('status') || '');
  const [showNew, setShowNew] = useState(params.get('new') === '1');

  const load = () => {
    setPayments(null);
    const q = status ? `?status=${status}` : '';
    apiV1<{ payments: Payment[] }>(`/payments${q}`).then((r) => setPayments(r.payments)).catch(() => setPayments([]));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <>
      <PageHead
        title="Paiements"
        sub="Toutes vos intentions de paiement (mode test)."
        actions={
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            + Nouveau paiement
          </button>
        }
      />
      <div className="toolbar">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setParams(e.target.value ? { status: e.target.value } : {}); }} className="select">
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="processing">En traitement</option>
          <option value="succeeded">Réussi</option>
          <option value="failed">Échoué</option>
          <option value="cancelled">Annulé</option>
          <option value="expired">Expiré</option>
        </select>
      </div>

      {!payments ? (
        <Spinner />
      ) : payments.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="💳"
            title="Aucun paiement"
            sub="Créez un paiement de test pour voir le flux complet : API → checkout → webhook."
            cta={
              <button className="btn btn-primary" onClick={() => setShowNew(true)}>
                Créer mon premier paiement
              </button>
            }
          />
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Description</th>
                <th>Montant</th>
                <th>Méthode</th>
                <th>Statut</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td><Link to={`/app/payments/${p.id}`} className="mono">{shortId(p.id)}</Link></td>
                  <td>{p.description || '—'}</td>
                  <td className="mono">{formatMoney(p.amount_minor, p.currency)}</td>
                  <td>{p.provider ? (METHODS[p.provider]?.label ?? p.provider) : '—'}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td className="muted">{formatDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <NewPaymentModal
          onClose={() => { setShowNew(false); setParams({}); }}
          onCreated={(id) => {
            setShowNew(false);
            toast('success', 'Paiement créé 🎉');
            setParams({});
            load();
            // laisse la liste se rafraîchir puis navigue
            setTimeout(() => (window.location.href = `/app/payments/${id}`), 250);
          }}
        />
      )}
    </>
  );
}

function NewPaymentModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }): JSX.Element {
  const [amountMinor, setAmountMinor] = useState('25000');
  const [currency, setCurrency] = useState('XOF');
  const [methods, setMethods] = useState<string[]>(Object.keys(METHODS));
  const [description, setDescription] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [idemKey, setIdemKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const toggle = (m: string) => setMethods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const res = await apiV1<{ payment: Payment }>('/payments', {
        method: 'POST',
        body: {
          amount_minor: Number(amountMinor),
          currency,
          methods,
          description,
          redirect_url: redirectUrl || undefined,
          idempotency_key: idemKey || undefined,
        },
      });
      onCreated(res.payment.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur');
      setBusy(false);
    }
  };

  return (
    <Modal title="Nouveau paiement (test)" onClose={onClose} wide>
      <form onSubmit={submit} className="form form-grid">
        <div>
          <label>Montant (unités mineures)</label>
          <input type="number" min="1" value={amountMinor} onChange={(e) => setAmountMinor(e.target.value)} required />
          <p className="hint">XOF : 25000 = 25 000 F · EUR : 2500 = 25,00 €</p>
        </div>
        <div>
          <label>Devise</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="select">
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="full">
          <label>Méthodes acceptées</label>
          <div className="methods-grid">
            {Object.entries(METHODS).map(([id, m]) => (
              <label key={id} className={`method-chip ${methods.includes(id) ? 'on' : ''}`}>
                <input type="checkbox" checked={methods.includes(id)} onChange={() => toggle(id)} />
                {m.emoji} {m.label}
              </label>
            ))}
          </div>
        </div>
        <div className="full">
          <label>Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Abonnement Premium — 1 mois" />
        </div>
        <div className="full">
          <label>URL de redirection (après succès)</label>
          <input value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} placeholder="https://app.ma.com/succes" />
        </div>
        <div className="full">
          <label>Clé d'idempotence (optionnel)</label>
          <input value={idemKey} onChange={(e) => setIdemKey(e.target.value)} placeholder="cmd-2026-08-12-001" />
        </div>
        {err && <div className="form-error full">{err}</div>}
        <div className="full form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Création…' : 'Créer le paiement'}</button>
        </div>
      </form>
    </Modal>
  );
}
