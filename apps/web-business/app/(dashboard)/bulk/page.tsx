import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Paiements bulk' };

export default function BulkPage() {
  return (
    <div className="card">
      <h1>Paiements bulk</h1>
      <p className="muted">
        Envoi de paiements en masse (CSV, suivi des lots — placeholder, GOURSI-043).
      </p>
    </div>
  );
}
