import type { Metadata } from 'next';
import { apiFetch } from '../../../lib/api/client';
import { DataTable } from '../../../components/data-table';

export const metadata: Metadata = {
  title: 'Transactions',
};

export const dynamic = 'force-dynamic';

interface TransactionRow {
  id?: string;
  type?: string;
  amount?: string;
  status?: string;
  createdAt?: string;
}

export default async function TransactionsPage() {
  const result = await apiFetch<TransactionRow[]>('/api/v1/transactions');
  const rows = result.ok && Array.isArray(result.data) ? result.data : [];
  const error = !result.ok ? `GET /api/v1/transactions → ${result.status} : ${result.message}` : undefined;

  return (
    <section>
      <h1>Transactions</h1>
      <p className="page-intro">
        Historique et supervision des transactions (SUPER_ADMIN, FINANCE_MANAGER).
      </p>
      <DataTable
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'type', label: 'Type' },
          { key: 'amount', label: 'Montant' },
          { key: 'status', label: 'Statut' },
          { key: 'createdAt', label: 'Date' },
        ]}
        rows={rows.map((tx) => ({
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          status: tx.status,
          createdAt: tx.createdAt,
        }))}
        emptyMessage="Aucune donnée — l'endpoint administrateur /api/v1/transactions n'est pas encore exposé par api-core."
        error={error}
      />
    </section>
  );
}
