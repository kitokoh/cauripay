/**
 * Vue d'ensemble (/dashboard) — statistiques placeholder alimentées par
 * api-core (GET /api/v1/health ; les compteurs réels viendront avec les
 * endpoints administrateurs de GOURSI-042b+).
 */
import type { Metadata } from 'next';
import { apiFetch } from '../../../lib/api/client';

export const metadata: Metadata = {
  title: 'Vue d\u2019ensemble',
};

export const dynamic = 'force-dynamic';

interface HealthStatus {
  status?: string;
  service?: string;
  version?: string;
  port?: number;
  checks?: Record<string, string>;
}

export default async function OverviewPage() {
  const health = await apiFetch<HealthStatus>('/api/v1/health');

  const apiStatus = health.ok ? (health.data?.status ?? 'ok') : 'injoignable';
  const database = health.ok ? (health.data?.checks?.database ?? '—') : '—';

  return (
    <section>
      <h1>Vue d&apos;ensemble</h1>
      <p className="page-intro">
        Statistiques de la plateforme — placeholder : les compteurs sont branchés sur api-core.
      </p>

      {!health.ok ? (
        <p className="api-warning">
          api-core injoignable (GET /api/v1/health → {health.status} : {health.message}) — les
          statistiques seront disponibles une fois api-core démarré.
        </p>
      ) : null}

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Statut api-core</span>
          <div className="stat-value">{apiStatus}</div>
          <div className="stat-hint">GET /api/v1/health</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Base de données</span>
          <div className="stat-value">{database}</div>
          <div className="stat-hint">check readiness api-core</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Utilisateurs</span>
          <div className="stat-value">—</div>
          <div className="stat-hint">endpoint administrateur à venir</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Transactions (24 h)</span>
          <div className="stat-value">—</div>
          <div className="stat-hint">endpoint administrateur à venir</div>
        </div>
      </div>
    </section>
  );
}
