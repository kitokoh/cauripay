import type { Metadata } from 'next';
import { apiFetch } from '../../../lib/api/client';
import { DataTable } from '../../../components/data-table';

export const metadata: Metadata = {
  title: 'KYC',
};

export const dynamic = 'force-dynamic';

interface KycRow {
  id?: string;
  userId?: string;
  status?: string;
  submittedAt?: string;
}

export default async function KycPage() {
  const result = await apiFetch<KycRow[]>('/api/v1/kyc');
  const rows = result.ok && Array.isArray(result.data) ? result.data : [];
  const error = !result.ok ? `GET /api/v1/kyc → ${result.status} : ${result.message}` : undefined;

  return (
    <section>
      <h1>KYC</h1>
      <p className="page-intro">
        Dossiers de vérification d&apos;identité et file compliance (COMPLIANCE_OFFICER,
        SUPER_ADMIN).
      </p>
      <DataTable
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'userId', label: 'Utilisateur' },
          { key: 'status', label: 'Statut' },
          { key: 'submittedAt', label: 'Soumis le' },
        ]}
        rows={rows.map((kyc) => ({ id: kyc.id, userId: kyc.userId, status: kyc.status, submittedAt: kyc.submittedAt }))}
        emptyMessage="Aucune donnée — l'endpoint administrateur /api/v1/kyc n'est pas encore exposé."
        error={error}
      />
    </section>
  );
}
