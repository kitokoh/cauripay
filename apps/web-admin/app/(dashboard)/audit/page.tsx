import type { Metadata } from 'next';
import { apiFetch } from '../../../lib/api/client';
import { DataTable } from '../../../components/data-table';

export const metadata: Metadata = {
  title: 'Audit',
};

export const dynamic = 'force-dynamic';

interface AuditRow {
  id?: string;
  actor?: string;
  action?: string;
  resource?: string;
  createdAt?: string;
}

export default async function AuditPage() {
  const result = await apiFetch<AuditRow[]>('/api/v1/audit/logs');
  const rows = result.ok && Array.isArray(result.data) ? result.data : [];
  const error = !result.ok ? `GET /api/v1/audit/logs → ${result.status} : ${result.message}` : undefined;

  return (
    <section>
      <h1>Audit</h1>
      <p className="page-intro">
        Journal d&apos;audit des actions sensibles (SUPER_ADMIN, COMPLIANCE_OFFICER,
        FINANCE_MANAGER).
      </p>
      <DataTable
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'actor', label: 'Acteur' },
          { key: 'action', label: 'Action' },
          { key: 'resource', label: 'Ressource' },
          { key: 'createdAt', label: 'Date' },
        ]}
        rows={rows.map((entry) => ({
          id: entry.id,
          actor: entry.actor,
          action: entry.action,
          resource: entry.resource,
          createdAt: entry.createdAt,
        }))}
        emptyMessage="Aucune donnée — l'endpoint administrateur /api/v1/audit/logs n'est pas encore exposé."
        error={error}
      />
    </section>
  );
}
