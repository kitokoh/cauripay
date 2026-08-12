import { useEffect, useState } from 'react';
import { request, type Attempt, type Webhook } from '../api';
import { formatDate, shortId } from '../format';
import { PageHead } from '../components/Layout';
import { EmptyState, Spinner } from '../components/StatCard';
import { Modal } from '../components/Modal';
import { toast } from '../components/Toast';

const EVENT_TYPES = ['payment.created', 'payment.processing', 'payment.succeeded', 'payment.failed', 'payment.cancelled', 'payment.expired'];
const EVENT_LABEL: Record<string, string> = {
  'payment.created': 'Paiement créé',
  'payment.processing': 'En traitement',
  'payment.succeeded': 'Paiement réussi',
  'payment.failed': 'Paiement échoué',
  'payment.cancelled': 'Paiement annulé',
  'payment.expired': 'Paiement expiré',
};

export function WebhooksPage(): JSX.Element {
  const [webhooks, setWebhooks] = useState<Webhook[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [attemptsFor, setAttemptsFor] = useState<Webhook | null>(null);

  const load = () => request<{ webhooks: Webhook[] }>('/webhooks').then((r) => setWebhooks(r.webhooks)).catch(() => setWebhooks([]));
  useEffect(() => {
    load();
  }, []);

  const toggle = async (w: Webhook) => {
    try {
      await request(`/webhooks/${w.id}`, { method: 'PATCH', body: { active: w.active ? 0 : 1 } });
      toast('success', w.active ? 'Webhook désactivé.' : 'Webhook activé.');
      load();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Erreur');
    }
  };

  const del = async (w: Webhook) => {
    if (!confirm(`Supprimer le webhook ${w.url} ?`)) return;
    try {
      await request(`/webhooks/${w.id}`, { method: 'DELETE' });
      toast('success', 'Webhook supprimé.');
      load();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Erreur');
    }
  };

  const replay = async (w: Webhook) => {
    try {
      await request(`/webhooks/${w.id}/replay`, { method: 'POST' });
      toast('success', 'Rejeu déclenché.');
      load();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Erreur');
    }
  };

  const ping = async (w: Webhook) => {
    try {
      await request(`/webhooks/${w.id}/test`, { method: 'POST' });
      toast('success', 'Ping de test envoyé.');
      load();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Erreur');
    }
  };

  return (
    <>
      <PageHead
        title="Webhooks"
        sub="Soyez notifié en temps réel des événements de paiement (signature HMAC)."
        actions={
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            + Ajouter un endpoint
          </button>
        }
      />
      {!webhooks ? (
        <Spinner />
      ) : webhooks.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🔔"
            title="Aucun webhook configuré"
            sub="Recevez payment.succeeded et les autres événements sur votre serveur, avec signature HMAC vérifiable."
            cta={
              <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                Configurer un endpoint
              </button>
            }
          />
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>URL</th>
                <th>Événements</th>
                <th>Mode</th>
                <th>Actif</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((w) => (
                <tr key={w.id}>
                  <td className="mono break">{w.url}</td>
                  <td>{w.events.includes('*') ? 'Tous (*)' : w.events.map((e) => EVENT_LABEL[e] ?? e).join(', ')}</td>
                  <td><span className={`badge ${w.mode === 'test' ? 'badge-test' : 'badge-live'}`}>{w.mode}</span></td>
                  <td>
                    <button className={`toggle ${w.active ? 'on' : ''}`} onClick={() => toggle(w)} aria-label="Activer/désactiver">
                      <span className="toggle-knob" />
                    </button>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-sm" onClick={() => setAttemptsFor(w)}>Tentatives</button>
                      <button className="btn btn-sm" onClick={() => replay(w)}>Rejouer</button>
                      <button className="btn btn-sm" onClick={() => ping(w)}>Tester</button>
                      <button className="btn btn-sm btn-danger" onClick={() => del(w)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddWebhookModal onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); load(); }} />}
      {attemptsFor && <AttemptsModal webhook={attemptsFor} onClose={() => setAttemptsFor(null)} />}
    </>
  );
}

function AddWebhookModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }): JSX.Element {
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['*']);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const toggleAll = () => setEvents((prev) => (prev.includes('*') ? [] : ['*']));
  const toggle = (e: string) =>
    setEvents((prev) => {
      if (prev.includes('*')) return [e];
      return prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e];
    });

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const res = await request<{ webhook_secret: string }>('/webhooks', { method: 'POST', body: { url, events: events.length ? events : ['*'], mode: 'test' } });
      toast('info', `Secret de signature : ${res.webhook_secret}`);
      toast('success', 'Endpoint créé.');
      onAdded();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur');
      setBusy(false);
    }
  };

  return (
    <Modal title="Nouvel endpoint webhook" onClose={onClose} wide>
      <form onSubmit={submit} className="form">
        <label>URL de l'endpoint (https)</label>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://mon-api.com/cauripay/hooks" required />
        <label>Événements</label>
        <div className="methods-grid">
          <label className={`method-chip ${events.includes('*') ? 'on' : ''}`}>
            <input type="checkbox" checked={events.includes('*')} onChange={toggleAll} /> Tous les événements
          </label>
          {EVENT_TYPES.map((e) => (
            <label key={e} className={`method-chip ${events.includes(e) ? 'on' : ''}`}>
              <input type="checkbox" checked={events.includes(e)} onChange={() => toggle(e)} /> {EVENT_LABEL[e]}
            </label>
          ))}
        </div>
        {err && <div className="form-error">{err}</div>}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Création…' : 'Créer'}</button>
        </div>
      </form>
    </Modal>
  );
}

function AttemptsModal({ webhook, onClose }: { webhook: Webhook; onClose: () => void }): JSX.Element {
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);

  useEffect(() => {
    request<{ attempts: Attempt[] }>(`/webhooks/${webhook.id}/attempts`).then((r) => setAttempts(r.attempts)).catch(() => setAttempts([]));
  }, [webhook.id]);

  return (
    <Modal title={`Tentatives — ${shortId(webhook.id)}`} onClose={onClose} wide>
      {!attempts ? (
        <Spinner />
      ) : attempts.length === 0 ? (
        <EmptyState icon="📭" title="Aucune tentative" sub="Les événements reçus apparaîtront ici avec leur payload signé." />
      ) : (
        <div className="attempts">
          {attempts.map((a) => (
            <div key={a.id} className="attempt">
              <div className="attempt-head">
                <strong>{EVENT_LABEL[a.event_type] ?? a.event_type}</strong>
                <span className={`badge ${a.status === 'delivered' ? 'badge-succeeded' : 'badge-failed'}`}>{a.status === 'delivered' ? 'Livré' : 'Échec'}</span>
                <span className="muted">{formatDate(a.created_at)} · {a.attempts} tentative{a.attempts > 1 ? 's' : ''} · HTTP {a.http_status ?? '—'}</span>
              </div>
              {a.last_error && <div className="hint err-text">Dernière erreur : {a.last_error}</div>}
              <details>
                <summary className="hint">Voir le payload signé</summary>
                <pre className="pre">{JSON.stringify(a.payload, null, 2)}</pre>
                <pre className="pre sig">Signature : {a.signature}</pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
