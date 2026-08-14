import type { Metadata } from 'next';
import { apiFetch } from '../../../lib/api/client';
import { DataTable } from '../../../components/data-table';

export const metadata: Metadata = {
  title: 'Agents',
};

export const dynamic = 'force-dynamic';

interface AgentRow {
  id?: string;
  name?: string;
  phone?: string;
  status?: string;
  createdAt?: string;
}

export default async function AgentsPage() {
  const result = await apiFetch<AgentRow[]>('/api/v1/agents');
  const rows = result.ok && Array.isArray(result.data) ? result.data : [];
  const error = !result.ok ? `GET /api/v1/agents → ${result.status} : ${result.message}` : undefined;

  return (
    <section>
      <h1>Agents</h1>
      <p className="page-intro">
        Réseau d&apos;agents et supervision des points de service (OPS_AGENT_MANAGER,
        SUPER_ADMIN).
      </p>
      <DataTable
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Nom' },
          { key: 'phone', label: 'Téléphone' },
          { key: 'status', label: 'Statut' },
          { key: 'createdAt', label: 'Créé le' },
        ]}
        rows={rows.map((agent) => ({
          id: agent.id,
          name: agent.name,
          phone: agent.phone,
          status: agent.status,
          createdAt: agent.createdAt,
        }))}
        emptyMessage="Aucune donnée — l'endpoint administrateur /api/v1/agents n'est pas encore exposé."
        error={error}
      />
    </section>
  );
}
