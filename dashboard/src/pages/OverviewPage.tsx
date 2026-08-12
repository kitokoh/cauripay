import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { request, type Payment } from '../api';
import { formatDate, formatMoney, shortId, methodLabel } from '../format';
import { PageHead } from '../components/Layout';
import { StatCard, EmptyState, Spinner } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';

interface Stats {
  totals: { count: number; volume_minor: number; success_rate: number };
  by_day: { date: string; count: number; volume_minor: number; succeeded: number }[];
  recent: Payment[];
}

export function OverviewPage(): JSX.Element {
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    request<Stats>('/stats').then(setStats).catch((e) => setErr(e instanceof Error ? e.message : 'Erreur'));
  }, []);

  if (err) return <div className="error-box">{err}</div>;
  if (!stats) return <Spinner />;

  const maxDay = Math.max(1, ...stats.by_day.map((d) => d.volume_minor));
  const rate = Math.round(stats.totals.success_rate * 100);

  return (
    <>
      <PageHead
        title="Vue d'ensemble"
        sub="Statistiques de vos paiements en mode test."
        actions={
          <Link to="/app/payments?new=1" className="btn btn-primary">
            + Créer un paiement
          </Link>
        }
      />
      <div className="stats-grid">
        <StatCard label="Volume (test)" value={formatMoney(stats.totals.volume_minor, 'XOF')} sub="Somme des paiements réussis" accent />
        <StatCard label="Paiements" value={String(stats.totals.count)} sub="Tous statuts confondus" />
        <StatCard label="Taux de réussite" value={`${rate} %`} sub="Paiements réussis / total" />
      </div>

      <div className="card">
        <h3 className="card-title">Volume des 7 derniers jours</h3>
        <div className="bars">
          {stats.by_day.map((d) => (
            <div key={d.date} className="bar-col" title={`${d.date} — ${formatMoney(d.volume_minor, 'XOF')} (${d.succeeded}/${d.count})`}>
              <div className="bar" style={{ height: `${Math.max(4, Math.round((d.volume_minor / maxDay) * 120))}px` }} />
              <span className="bar-label">{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Derniers paiements</h3>
        {stats.recent.length === 0 ? (
          <EmptyState
            icon="🪙"
            title="Aucun paiement pour l'instant"
            sub="Créez votre premier paiement de test et vivez le flux complet en 30 secondes."
            cta={
              <Link to="/app/payments?new=1" className="btn btn-primary">
                Créer un paiement de test
              </Link>
            }
          />
        ) : (
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
              {stats.recent.map((p) => (
                <tr key={p.id}>
                  <td><Link to={`/app/payments/${p.id}`} className="mono">{shortId(p.id)}</Link></td>
                  <td>{p.description || '—'}</td>
                  <td className="mono">{formatMoney(p.amount_minor, p.currency)}</td>
                  <td>{methodLabel(p.provider)}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td className="muted">{formatDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
