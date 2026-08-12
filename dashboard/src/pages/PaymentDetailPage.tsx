import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiV1, request, type Payment } from '../api';
import { EVENT_LABELS, formatDate, formatMoney, methodLabel } from '../format';
import { StatusBadge } from '../components/StatusBadge';
import { Spinner } from '../components/StatCard';
import { toast } from '../components/Toast';

const ACTIVE = new Set(['pending', 'processing']);

export function PaymentDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [pay, setPay] = useState<Payment | null>(null);
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      const r = await request<{ payment: Payment }>(`/payments/${id}`);
      setPay(r.payment);
      setErr('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Polling léger pendant pending/processing
  useEffect(() => {
    if (!pay || !ACTIVE.has(pay.status)) return;
    let n = 0;
    const t = setInterval(async () => {
      n += 1;
      const r = await request<{ payment: Payment }>(`/payments/${id}`).catch(() => null);
      if (r?.payment) {
        setPay(r.payment);
        if (!ACTIVE.has(r.payment.status)) clearInterval(t);
      }
      if (n > 10) clearInterval(t);
    }, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pay?.status]);

  if (err) return <div className="error-box">{err} — <Link to="/app/payments">← retour</Link></div>;
  if (!pay) return <Spinner />;

  const simulate = async (action: 'approve' | 'fail' | 'expire', reason?: string) => {
    try {
      await apiV1<{ payment: Payment }>(`/sandbox/payments/${pay.id}/${action}`, { method: 'POST', body: action === 'fail' ? { reason } : undefined });
      toast('success', `Simulation ${action} effectuée — webhooks envoyés.`);
      await load();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Erreur');
    }
  };

  const isActive = ACTIVE.has(pay.status);

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/app/payments" className="back-link">← Paiements</Link>
          <h1 className="mono">{pay.id}</h1>
          <p className="muted">Créé le {formatDate(pay.created_at)}</p>
        </div>
        <div className="page-actions">
          <StatusBadge status={pay.status} />
          <span className={`badge ${pay.mode === 'test' ? 'badge-test' : 'badge-live'}`}>{pay.mode === 'test' ? 'test' : 'live'}</span>
        </div>
      </div>

      <div className="detail-grid">
        <div className="card">
          <h3 className="card-title">Informations</h3>
          <dl className="kv">
            <dt>Montant</dt><dd className="mono amount-big">{formatMoney(pay.amount_minor, pay.currency)}</dd>
            <dt>Méthode</dt><dd>{methodLabel(pay.provider)}</dd>
            <dt>Téléphone</dt><dd className="mono">{pay.phone || '—'}</dd>
            <dt>Référence provider</dt><dd className="mono">{pay.provider_ref || '—'}</dd>
            <dt>Description</dt><dd>{pay.description || '—'}</dd>
            <dt>Metadata</dt><dd><pre className="pre">{JSON.stringify(pay.metadata, null, 2)}</pre></dd>
            <dt>URL de redirection</dt><dd className="mono break">{pay.redirect_url || '—'}</dd>
            <dt>Clé d'idempotence</dt><dd className="mono">{pay.idempotency_key || '—'}</dd>
          </dl>
        </div>

        <div className="card">
          <h3 className="card-title">Checkout & simulation</h3>
          <p className="hint">La checkout page hébergée reproduit le flux réel mobile money (téléphone → PIN).</p>
          <a className="btn btn-primary btn-block" href={pay.checkout_url} target="_blank" rel="noreferrer">
            🔗 Ouvrir la page de paiement
          </a>

          <div className="sim-box">
            <h4>🧪 Simulateur sandbox</h4>
            <p className="hint">Déclenchez une issue comme le ferait un opérateur (webhooks envoyés en direct).</p>
            <div className="sim-actions">
              <button className="btn btn-success" disabled={!isActive || pay.status === 'succeeded'} onClick={() => simulate('approve')}>✓ Approuver</button>
              <button className="btn btn-danger" disabled={!isActive || pay.status === 'failed'} onClick={() => simulate('fail', 'insufficient_funds')}>✕ Échouer</button>
              <button className="btn btn-ghost" disabled={!isActive || pay.status === 'expired'} onClick={() => simulate('expire')}>⏱ Expirer</button>
            </div>
            <p className="hint">Exemples d'API : <code>POST /api/v1/sandbox/payments/{pay.id}/approve</code></p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Timeline</h3>
        <div className="timeline">
          {pay.timeline.map((evt, i) => (
            <div key={i} className="timeline-item">
              <div className="timeline-dot" />
              <div>
                <strong>{EVENT_LABELS[evt.type] ?? evt.type}</strong>
                <span className="muted"> · {formatDate(evt.created_at)}</span>
                <div className="mono hint">{evt.type}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
