import type { Metadata } from 'next';
import { apiFetch } from '../../../lib/api/client';
import { DataTable } from '../../../components/data-table';

export const metadata: Metadata = {
  title: 'AML',
};

export const dynamic = 'force-dynamic';

interface AmlRow {
  id?: string;
  userId?: string;
  score?: number;
  status?: string;
  createdAt?: string;
}

export default async function AmlPage() {
  const result = await apiFetch<AmlRow[]>('/api/v1/aml/alerts');
  const rows = result.ok && Array.isArray(result.data) ? result.data : [];
  const error = !result.ok ? `GET /api/v1/aml/alerts → ${result.status} : ${result.message}` : undefined;

  return (
    <section>
      <h1>AML</h1>
      <p className="page-intro">
        Alertes de blanchiment et scores de risque (COMPLIANCE_OFFICER, SUPER_ADMIN).
      </p>
      <DataTable
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'userId', label: 'Utilisateur' },
          { key: 'score', label: 'Score risque' },
          { key: 'status', label: 'Statut' },
          { key: 'createdAt', label: 'Créé le' },
        ]}
        rows={rows.map((alert) => ({
          id: alert.id,
          userId: alert.userId,
          score: alert.score,
          status: alert.status,
          createdAt: alert.createdAt,
        }))}
        emptyMessage="Aucune donnée — l'endpoint administrateur /api/v1/aml/alerts n'est pas encore exposé."
        error={error}
      />
    </section>
  );
}
