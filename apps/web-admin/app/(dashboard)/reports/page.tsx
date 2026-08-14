import type { Metadata } from 'next';
import { apiFetch } from '../../../lib/api/client';
import { DataTable } from '../../../components/data-table';

export const metadata: Metadata = {
  title: 'Rapports',
};

export const dynamic = 'force-dynamic';

interface ReportRow {
  id?: string;
  name?: string;
  period?: string;
  generatedAt?: string;
}

export default async function ReportsPage() {
  const result = await apiFetch<ReportRow[]>('/api/v1/reports');
  const rows = result.ok && Array.isArray(result.data) ? result.data : [];
  const error = !result.ok ? `GET /api/v1/reports → ${result.status} : ${result.message}` : undefined;

  return (
    <section>
      <h1>Rapports</h1>
      <p className="page-intro">
        Rapports financiers et d&apos;activité (FINANCE_MANAGER, SUPER_ADMIN).
      </p>
      <DataTable
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Nom' },
          { key: 'period', label: 'Période' },
          { key: 'generatedAt', label: 'Généré le' },
        ]}
        rows={rows.map((report) => ({
          id: report.id,
          name: report.name,
          period: report.period,
          generatedAt: report.generatedAt,
        }))}
        emptyMessage="Aucune donnée — l'endpoint administrateur /api/v1/reports n'est pas encore exposé."
        error={error}
      />
    </section>
  );
}
