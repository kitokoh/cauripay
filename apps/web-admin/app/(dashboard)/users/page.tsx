import type { Metadata } from 'next';
import { apiFetch } from '../../../lib/api/client';
import { DataTable } from '../../../components/data-table';

export const metadata: Metadata = {
  title: 'Utilisateurs',
};

export const dynamic = 'force-dynamic';

interface UserRow {
  id?: string;
  email?: string;
  role?: string;
  createdAt?: string;
}

export default async function UsersPage() {
  const result = await apiFetch<UserRow[]>('/api/v1/users');
  const rows = result.ok && Array.isArray(result.data) ? result.data : [];
  const error = !result.ok ? `GET /api/v1/users → ${result.status} : ${result.message}` : undefined;

  return (
    <section>
      <h1>Utilisateurs</h1>
      <p className="page-intro">Gestion des utilisateurs de la plateforme (réservé SUPER_ADMIN).</p>
      <DataTable
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Rôle' },
          { key: 'createdAt', label: 'Créé le' },
        ]}
        rows={rows.map((user) => ({ id: user.id, email: user.email, role: user.role, createdAt: user.createdAt }))}
        emptyMessage="Aucune donnée — l'endpoint administrateur /api/v1/users n'est pas encore exposé par api-core."
        error={error}
      />
    </section>
  );
}
