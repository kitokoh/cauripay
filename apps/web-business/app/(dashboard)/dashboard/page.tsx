/**
 * Tableau de bord — paiements (placeholder GOURSI-043a).
 *
 * Les données proviennent de business-service (GOURSI-030+) via
 * lib/api/client.ts (X-Service-Key). Tant que le service n'est pas déployé,
 * la page affiche un état de repli explicite au lieu d'échouer.
 */
import { ApiClientError, apiClient } from '../../../lib/api/client';

interface PaymentsOverview {
  total: number;
  processedToday: number;
  pending: number;
  failed: number;
  recent: Array<{ id: string; reference: string; amount: string; status: string; createdAt: string }>;
}

export default async function DashboardPage() {
  let data: PaymentsOverview | null = null;
  let serviceError: string | null = null;

  try {
    data = await apiClient.get<PaymentsOverview>('/payments/overview');
  } catch (err) {
    if (err instanceof ApiClientError) {
      serviceError = `business-service indisponible (${err.message})`;
    } else {
      serviceError = 'business-service indisponible.';
    }
  }

  return (
    <>
      <div className="card">
        <h1>Tableau de bord — Paiements</h1>
        <p className="muted">
          Vue d'ensemble des paiements de l'entreprise (données : business-service).
        </p>
      </div>

      {serviceError ? (
        <div className="banner" role="status">
          {serviceError} — les données affichées ci-dessous sont un aperçu statique ;
          la structure d'intégration (lib/api/client.ts) est en place pour GOURSI-030+.
        </div>
      ) : null}

      {data ? (
        <>
          <div className="card">
            <h2>Aperçu</h2>
            <table className="table">
              <tbody>
                <tr>
                  <td>Total paiements</td>
                  <td>{data.total}</td>
                </tr>
                <tr>
                  <td>Traités aujourd'hui</td>
                  <td>{data.processedToday}</td>
                </tr>
                <tr>
                  <td>En attente</td>
                  <td>{data.pending}</td>
                </tr>
                <tr>
                  <td>Échoués</td>
                  <td>{data.failed}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="card">
            <h2>Derniers paiements</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((p) => (
                  <tr key={p.id}>
                    <td>{p.reference}</td>
                    <td>{p.amount}</td>
                    <td>{p.status}</td>
                    <td>{p.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="card">
          <h2>Derniers paiements</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="muted">
                  Aucune donnée — en attente de business-service (GOURSI-030).
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
